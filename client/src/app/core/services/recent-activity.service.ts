import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {Observable, of} from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '@/../environments/environment';
import {ApiResponse, PaginationInfo} from '@/core/models/_shared.models';
import {RecentActivity, RecentActivityAction, RecentActivityUser} from '@/core/models/recent-activity.models';
import {AuthService} from '@/core/services/auth.service';

export interface GetRecentActivitiesParams {
  page?: number;
  limit?: number;
  courseId?: string;
  action?: RecentActivityAction;
}

@Injectable({
  providedIn: 'root'
})
export class RecentActivityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/recent-activities`;
  private readonly authService = inject(AuthService);

  private readonly _activities = signal<RecentActivity[]>([]);
  private readonly _pagination = signal<PaginationInfo | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly activities = this._activities.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  getRecentActivities(params: GetRecentActivitiesParams = {}): Observable<ApiResponse<{ activities: RecentActivity[], pagination: PaginationInfo }>> {
    this._isLoading.set(true);
    this._error.set(null);

    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.courseId) httpParams = httpParams.set('courseId', params.courseId);
    if (params.action) httpParams = httpParams.set('action', params.action);

    return this.http.get<ApiResponse<{ activities: RecentActivity[], pagination: PaginationInfo }>>(this.baseUrl, { params: httpParams }).pipe(
      tap(response => {
        if (response.success) {
          this._activities.set(response.data.activities);
          this._pagination.set(response.data.pagination);
        }
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._error.set(error.message);
        this._isLoading.set(false);
        return of(error);
      })
    );
  }

  getMessage(activity: RecentActivity): string {
    const actorName = this.getActorName(activity);
    const courseName = activity.course.code ?? '?';
    const activityName = activity.activity?.title ?? '?';
    const currentUser = this.authService.user();
    const isCurrentUser = activity.actor.kind === 'user' &&
                         typeof activity.actor.data !== 'string' &&
                         activity.actor.data._id === currentUser?._id;

    switch (activity.action) {
      case 'create':
        if (activity.actor.kind === 'system') {
          return `Nouvelle activité "${activityName}" créée dans le cours ${courseName}`;
        }
        if (isCurrentUser) {
          return `Vous avez créé l'activité "${activityName}" dans le cours ${courseName}`;
        }
        return `${actorName} a créé l'activité "${activityName}" dans le cours ${courseName}`;

      case 'update':
        if (activity.actor.kind === 'system') {
          return `L'activité "${activityName}" du cours ${courseName} a été mise à jour`;
        }
        if (isCurrentUser) {
          return `Vous avez mis à jour l'activité "${activityName}" dans le cours ${courseName}`;
        }
        return `${actorName} a mis à jour l'activité "${activityName}" dans le cours ${courseName}`;

      case 'submit':
        const filesText = this.getFilesText(activity.metadata?.filesCount);
        if (isCurrentUser) {
          return `Vous avez rendu votre travail pour l'activité "${activityName}" dans le cours ${courseName}${filesText}`;
        }
        if (activity.actor.kind === 'system') {
          return `Travail soumis pour l'activité "${activityName}" dans le cours ${courseName}${filesText}`;
        }
        return `${actorName} a rendu son travail pour l'activité "${activityName}" dans le cours ${courseName}${filesText}`;

      case 'grade':
        const gradeText = activity.metadata?.grade !== undefined ? ` (Note: ${activity.metadata.grade}/20)` : '';
        const targetName = activity.targetUser?.fullName ?? 'un étudiant';
        const isCurrentUserGraded = activity.targetUser?._id === currentUser?._id;

        if (isCurrentUser) {
          return `Vous avez évalué le travail de ${targetName} pour l'activité "${activityName}" dans le cours ${courseName}${gradeText}`;
        }
        if (isCurrentUserGraded) {
          if (activity.actor.kind === 'system') {
            return `Votre travail pour l'activité "${activityName}" dans le cours ${courseName} a été évalué automatiquement${gradeText}`;
          }
          return `${actorName} a évalué votre travail pour l'activité "${activityName}" dans le cours ${courseName}${gradeText}`;
        }
        if (activity.actor.kind === 'system') {
          return `Évaluation automatique pour "${activityName}" dans le cours ${courseName}${gradeText}`;
        }
        return `${actorName} a évalué le travail de ${targetName} pour l'activité "${activityName}" dans le cours ${courseName}${gradeText}`;

      case 'add_to_course':
        const addedUserName = activity.targetUser?.fullName ?? 'un utilisateur';
        const isCurrentUserAdded = activity.targetUser?._id === currentUser?._id;

        if (activity.actor.kind === 'system') {
          if (isCurrentUserAdded) {
            return `Vous avez été ajouté automatiquement au cours ${courseName}`;
          }
          return `${addedUserName} a été ajouté automatiquement au cours ${courseName}`;
        }
        if (isCurrentUser) {
          return `Vous avez ajouté ${addedUserName} au cours ${courseName}`;
        }
        if (isCurrentUserAdded) {
          return `Vous avez été ajouté au cours ${courseName} par ${actorName}`;
        }
        return `${actorName} a ajouté ${addedUserName} au cours ${courseName}`;

      case 'due_soon':
        const completionPercentage = activity.metadata?.completionPercentage ?? 0;
        const dueActivity = activity.activity as any;
        const dueDate = dueActivity?.dueAt ? new Date(dueActivity.dueAt).toLocaleDateString('fr-FR') : 'bientôt';
        // For students: personal reminder if they haven't submitted
        if (this.authService.isStudent()) {
          return `⏰ Votre activité "${activityName}" du cours ${courseName} est bientôt due (${dueDate})`;
        }
        // For teachers: class overview
        return `⏰ L'activité "${activityName}" du cours ${courseName} est bientôt due (${dueDate}) - ${completionPercentage}% des étudiants ont terminé`;

      case 'overdue':
        const overdueCount = activity.metadata?.overdueStudentCount ?? activity.metadata?.overdueStudentNames?.length ?? 0;
        const overduePeriod = activity.metadata?.overduePeriod ?? '';
        const periodText = overduePeriod ? ` depuis ${overduePeriod}` : '';
        // For students: personal warning if they haven't submitted
        if (this.authService.isStudent()) {
          return `⚠️ Votre activité "${activityName}" du cours ${courseName} est en retard${periodText}`;
        }
        // For teachers: class overview
        return `⚠️ L'activité "${activityName}" du cours ${courseName} est en retard${periodText} - ${overdueCount} étudiant${overdueCount > 1 ? 's' : ''} n'${overdueCount > 1 ? 'ont' : 'a'} pas encore rendu`;

      default:
        return 'Activité inconnue';
    }
  }

  private getFilesText(filesCount?: number): string {
    if (!filesCount) return '';
    if (filesCount === 1) return ' (1 fichier)';
    return ` (${filesCount} fichiers)`;
  }

  getActorInitials(activity: RecentActivity) {
    const name = this.getActorName(activity);
    return name.split(' ').map(part => part.charAt(0).toUpperCase()).join('');
  }

  getActorName(activity: RecentActivity) {
    if (activity.actor.kind === 'user' && typeof activity.actor.data !== 'string') {
      const user = activity.actor.data;
      return `${user.fullName}`;
    }
    return 'System';
  }

  isUser(actorData: RecentActivityUser | string): actorData is RecentActivityUser {
    return typeof actorData === 'object' && '_id' in actorData;
  }
}
