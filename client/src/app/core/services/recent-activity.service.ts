import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '@/../environments/environment';
import {ApiResponse, DepositDetailsForTeacher, PaginationInfo} from '@/core/models/_shared.models';
import {RecentActivity, RecentActivityAction, RecentActivityUser} from '@/core/models/recent-activity.models';

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

    switch (activity.action) {
      case 'create':
        return `A ajouté ${activityName} dans ${courseName}`;
      case 'update':
        return `A mis à jour l'activité ${activityName} dans ${courseName}`;
      case 'submit':
        const numberOfFiles = activity.metadata?.filesCount ? ` (${activity.metadata?.filesCount} fichiers)` : '';
        return `A complété l'activité ${activityName} dans ${courseName}${numberOfFiles}`;
      case 'grade':
        const grade = activity.metadata?.grade ? `, note: ${activity.metadata.grade}/20` : '';
        return `A évalué ton travail pour l'activité ${activityName} dans ${courseName}${grade}`;
      case 'add_to_course':
        return `${activity.targetUser?.fullName} a été ajouté au cours ${courseName} par l'administrateur ${actorName}`;
      case 'due_soon':
        return `Activitée ${activityName} dans ${courseName} complété à ${activity.metadata!.completionPercentage}%, 24h remaining`;
      case 'overdue':
        return `L'activitée ${activityName} n'a pas été complété à temps par ${activity.metadata?.overdueStudentNames?.length} étudiants`;
      default:
        return 'Activité inconnue';
    }
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
    return (actorData as RecentActivityUser)._id !== undefined;
  }
}
