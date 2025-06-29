import {Component, OnInit, OnDestroy, inject, signal, computed} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, takeUntil, switchMap, forkJoin, of } from 'rxjs';

import { CourseActivitiesService } from '@/core/services/course-activities.service';
import { CourseUnitsService } from '@/core/services/course-units.service';
import { CourseGroupsService } from '@/core/services/course-groups.service';
import { AuthService } from '@/core/services/auth.service';
import { CourseActivity, FileActivity, FileDepositoryActivity, MessageActivity } from '@/core/models/course-activity.models';
import { CourseUnit } from '@/core/models/course-unit.models';
import { PopulatedCourseGroup } from '@/core/models/course-group.models';
import { User } from '@/core/models/user.models';

import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { Collapsible } from '@/shared/components/ui/collapsible/collapsible';
import { SidebarLayout } from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import { StudentDepositInterfaceComponent } from '../student-deposit-interface/student-deposit-interface';
import { TeacherDepositsTableComponent } from '../teacher-deposits-table/teacher-deposits-table';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {ButtonComponent} from '@/shared/components/ui/button/button';
import {RecentActivitySidebar} from '@/shared/components/ui/recent-activity-sidebar/recent-activity-sidebar';

@Component({
  selector: 'app-activity-display-page',
  imports: [
    CommonModule,
    LucideAngularModule,
    IconButtonComponent,
    Collapsible,
    SidebarLayout,
    StudentDepositInterfaceComponent,
    TeacherDepositsTableComponent,
    ButtonComponent,
    RecentActivitySidebar
  ],
  templateUrl: './activity-display-page.html'
})
export class ActivityDisplayPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly activityService = inject(CourseActivitiesService);
  private readonly courseUnitsService = inject(CourseUnitsService);
  private readonly courseGroupsService = inject(CourseGroupsService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly sanitizer = inject(DomSanitizer);

  activity = signal<CourseActivity | null>(null);
  courseUnit = signal<CourseUnit | null>(null);
  currentUser = signal<User | null>(null);
  isTeacher = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  activityTitle = computed(() => {
    const activity = this.activity();
    return activity ? activity.title : 'Chargement...';
  });


  ngOnInit() {
    // Get current user from the signal
    this.currentUser.set(this.authService.user());

    // Load activity data
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const activityId = params['activityId'];
        const courseSlug = params['slug'];

        if (!activityId || !courseSlug) {
          this.error.set('Invalid activity or course');
          return of(null);
        }

        this.isLoading.set(true);

        return forkJoin({
          activity: this.activityService.getActivityById(activityId),
          courseUnit: this.courseUnitsService.getCourseUnitBySlug(courseSlug),
          courseGroups: this.courseGroupsService.getGroupsByCourseUnitSlug(courseSlug)
        });
      })
    ).subscribe({
      next: (result) => {
        if (result) {
          if (result.activity.success) {
            this.activity.set(result.activity.data.activity);
          } else {
            this.error.set('Activity not found');
          }

          if (result.courseUnit.success) {
            this.courseUnit.set(result.courseUnit.data.courseUnit);

            // Check user role using course groups data
            if (result.courseGroups.success) {
              this.checkUserRole(result.courseGroups.data.groups);
            } else {
              this.error.set('Could not load course groups');
            }
          } else {
            this.error.set('Course not found');
          }
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading activity:', error);
        this.error.set('Failed to load activity');
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkUserRole(groups: PopulatedCourseGroup[]) {
    const currentUser = this.currentUser();
    if (!currentUser) return;

    // Handle both _id and id fields for user identification
    const userId = currentUser._id || (currentUser as any).id;
    if (!userId) return;

    // Check if user is a teacher in any group for this course unit
    const isTeacher = groups.some((group: PopulatedCourseGroup) =>
      group.users?.some((userEntry: any) => {
        return userEntry.user._id === userId && userEntry.role === 'teacher';
      })
    );

    this.isTeacher.set(isTeacher);
  }

  getActivityTypeIcon(): string {
    const activity = this.activity();
    if (!activity) return 'file';

    switch (activity.activityType) {
      case 'message': return 'message-circle';
      case 'file': return 'file';
      case 'file-depository': return 'upload';
      default: return 'file';
    }
  }

  getActivityTypeLabel(): string {
    const activity = this.activity();
    if (!activity) return '';

    switch (activity.activityType) {
      case 'message': return 'Message';
      case 'file': return 'Fichier';
      case 'file-depository': return 'Dépôt de fichiers';
      default: return '';
    }
  }

  goBack() {
    const courseSlug = this.route.snapshot.params['slug'];
    void this.router.navigate(['/courses', courseSlug]);
  }

  onActivityUpdated() {
    // Reload the activity data
    const activityId = this.route.snapshot.params['activityId'];
    this.activityService.getActivityById(activityId).subscribe({
      next: (response) => {
        if (response.success) {
          this.activity.set(response.data.activity);
        }
      },
      error: (error) => {
        console.error('Error reloading activity:', error);
      }
    });
  }

  // Type guards for templates
  asMessageActivity(activity: CourseActivity): MessageActivity {
    return activity as MessageActivity;
  }

  asFileActivity(activity: CourseActivity): FileActivity & { fileUrl?: string } {
    return activity as FileActivity & { fileUrl?: string };
  }

  asFileDepositoryActivity(activity: CourseActivity): FileDepositoryActivity & {
    instructions: {
      type: 'file' | 'text',
      text?: string,
      file?: string,
      fileUrl?: string
    }
  } {
    return activity as FileDepositoryActivity & {
      instructions: {
        type: 'file' | 'text',
        text?: string,
        file?: string,
        fileUrl?: string
      }
    };
  }

  isOverdue(dueAt: Date): boolean {
    return new Date(dueAt) < new Date();
  }

  getDueDate(dueAt: Date): Date {
    return new Date(dueAt);
  }

  hasCompletionRate(activity: CourseActivity): boolean {
    return (activity as any).completionRate !== undefined;
  }

  getCompletionRate(activity: CourseActivity): number {
    return (activity as any).completionRate || 0;
  }

  getSanitizedFileUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;
    try {
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } catch (e) {
      console.error('Error sanitizing file URL:', e);
      return null;
    }
  }

  getDescription(): string {
    const activity = this.activity();
    return activity?.content || 'Aucune description fournie.';
  }
}
