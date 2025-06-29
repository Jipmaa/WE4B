import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError, forkJoin, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, DepositDetailsForTeacher } from '@/core/models/_shared.models';
import { CourseUnit } from '@/core/models/course-unit.models';
import { FileDepositoryActivity } from '@/core/models/course-activity.models';
import { MyDepositedFilesResponse } from '@/core/models/deposited-files.models';
import { AuthService } from '@/core/services/auth.service';
import { CourseUnitsService } from '@/core/services/course-units.service';
import { CourseActivitiesService } from '@/core/services/course-activities.service';
import { DepositedFilesService } from '@/core/services/deposited-files.service';
import { categorizeCourseGroups, isCourseGroupCurrentlyActive } from '@/shared/utils/course-scheduling';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly courseUnitsService = inject(CourseUnitsService);
  private readonly courseActivitiesService = inject(CourseActivitiesService);
  private readonly depositedFilesService = inject(DepositedFilesService);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  // State management with signals
  private readonly _currentCourse = signal<CourseUnit | null>(null);
  private readonly _upcomingCourses = signal<CourseUnit[]>([]);
  private readonly _teacherActivities = signal<DepositDetailsForTeacher[]>([]);
  private readonly _studentActivities = signal<(FileDepositoryActivity & {courseSlug: string})[]>([]);
  private readonly _recentActivities = signal<any[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly currentCourse = this._currentCourse.asReadonly();
  readonly upcomingCourses = this._upcomingCourses.asReadonly();
  readonly teacherActivities = this._teacherActivities.asReadonly();
  readonly studentActivities = this._studentActivities.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly hasDashboardData = computed(() => {
    return this._currentCourse() !== null ||
           this._upcomingCourses().length > 0 ||
           this._teacherActivities().length > 0 ||
           this._studentActivities().length > 0;
  });

  readonly totalUpcomingCourses = computed(() => this._upcomingCourses().length);
  readonly totalTeacherActivities = computed(() => this._teacherActivities().length);
  readonly totalStudentActivities = computed(() => this._studentActivities().length);

  readonly pendingFeedback = computed(() => {
    return this._teacherActivities().filter(activity => activity.feedbackRate < 100).length;
  });

  readonly missingDeposits = computed(() => {
    return this._teacherActivities().reduce((total, activity) => total + activity.missingStudentDeposits, 0);
  });

  // Computed signal for current course schedule info
  readonly currentCourseSchedule = computed(() => {
    const current = this._currentCourse();
    if (!current || !current.groups || current.groups.length === 0) {
      return null;
    }

    // Find the currently active group
    const activeGroup = current.groups.find(group => isCourseGroupCurrentlyActive(group));
    return activeGroup || null;
  });

  // Computed signal for next upcoming course
  readonly nextUpcomingCourse = computed(() => {
    const upcoming = this._upcomingCourses();
    return upcoming.length > 0 ? upcoming[0] : null;
  });

  // Computed signal for next upcoming course schedule info
  readonly nextUpcomingCourseSchedule = computed(() => {
    const nextCourse = this.nextUpcomingCourse();
    if (!nextCourse || !nextCourse.groups || nextCourse.groups.length === 0) {
      return null;
    }

    // Find the next upcoming group
    const categorized = categorizeCourseGroups(nextCourse.groups);
    return categorized.upcoming.length > 0 ? categorized.upcoming[0] : null;
  });

  // Categorize courses based on schedule
  private categorizeCourses(courses: CourseUnit[]): void {
    let currentCourse: CourseUnit | null = null;
    const upcomingCourses: CourseUnit[] = [];

    for (const course of courses) {
      if (course.groups && course.groups.length > 0) {
        // Check if any group is currently active (happening right now)
        const hasActiveGroup = course.groups.some(group => isCourseGroupCurrentlyActive(group));

        if (hasActiveGroup && !currentCourse) {
          // Set as current course if no current course is set yet
          currentCourse = course;
        } else {
          // Add to upcoming courses (will be sorted by next occurrence)
          upcomingCourses.push(course);
        }
      } else {
        // If no groups, treat as upcoming
        upcomingCourses.push(course);
      }
    }

    // If no course is currently active, don't fallback to setting any course as "current"
    // This ensures that only truly active courses are shown as "current"

    // Sort upcoming courses by their next session time
    upcomingCourses.sort((a, b) => {
      const aNextTime = this.getNextCourseTime(a);
      const bNextTime = this.getNextCourseTime(b);
      return aNextTime - bNextTime;
    });

    this._currentCourse.set(currentCourse);
    this._upcomingCourses.set(upcomingCourses);
  }

  // Get the next scheduled time for a course
  private getNextCourseTime(course: CourseUnit): number {
    if (!course.groups || course.groups.length === 0) {
      return Infinity; // Courses without schedule go to the end
    }

    const now = new Date().getTime();
    let nextTime = Infinity;

    for (const group of course.groups) {
      // Calculate next occurrence for this group
      const nextOccurrence = this.calculateNextGroupOccurrence(group);
      if (nextOccurrence < nextTime) {
        nextTime = nextOccurrence;
      }
    }

    return nextTime;
  }

  // Calculate next occurrence of a course group
  private calculateNextGroupOccurrence(group: any): number {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    const groupDay = dayMap[group.day];
    const [hours, minutes] = group.from.split(':').map(Number);
    const groupTime = hours * 60 + minutes;

    let daysUntilNext = groupDay - currentDay;

    // If it's the same day but the time has passed, schedule for next week
    if (daysUntilNext === 0 && currentTime >= groupTime) {
      daysUntilNext = 7;
    }

    // If it's earlier in the week, schedule for next week
    if (daysUntilNext < 0) {
      daysUntilNext += 7;
    }

    const nextOccurrence = new Date(now);
    nextOccurrence.setDate(now.getDate() + daysUntilNext);
    nextOccurrence.setHours(hours, minutes, 0, 0);

    return nextOccurrence.getTime();
  }

  // Dashboard initialization
  init(): Observable<ApiResponse<any>> {
    this._isLoading.set(true);
    this._error.set(null);

    const user = this.authService.user();
    if (!user) {
      this._error.set('User not authenticated');
      this._isLoading.set(false);
      return throwError(() => new Error('User not authenticated'));
    }

    const isTeacher = this.authService.isTeacher();

    // Load user's course units
    return this.courseUnitsService.getUserCourseUnits().pipe(
      tap(response => {
        if (response.success) {
          const courses = response.data.courseUnits;

          // Categorize courses based on their schedule
          this.categorizeCourses(courses);

          // Load activities based on user role
          if (isTeacher) {
            this.loadTeacherActivities().subscribe();
          } else {
            this.loadStudentActivities().subscribe();
          }
        }
      }),
      catchError(error => this.handleError(error)),
      tap(() => this._isLoading.set(false))
    );
  }

  // Load teacher-specific dashboard data
  private loadTeacherActivities(): Observable<ApiResponse<{ activities: DepositDetailsForTeacher[] }>> {
    return this.http.get<ApiResponse<{ activities: DepositDetailsForTeacher[] }>>(`${this.baseUrl}/teacher-deposits`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._teacherActivities.set(response.data.activities);
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  // Load student-specific dashboard data
  private loadStudentActivities(): Observable<ApiResponse<{ activities: FileDepositoryActivity[] }>> {
    // Get user's file-depository activities across all courses
    const userCourses = this.courseUnitsService.userCourseUnits();

    if (userCourses.length === 0) {
      this._studentActivities.set([]);
      return new Observable(subscriber => {
        subscriber.next({ success: true, data: { activities: [] } });
        subscriber.complete();
      });
    }

    // Load activities from all user's courses
    const courseActivitiesRequests = userCourses.map(course =>
      this.courseActivitiesService.getActivities({ courseUnit: course._id, activityType: 'file-depository' })
    );

    return forkJoin(courseActivitiesRequests).pipe(
      tap(responses => {
        const allActivities: (FileDepositoryActivity & {courseSlug: string})[] = [];

        responses.forEach((response, index) => {
          if (response.success) {
            const course = userCourses[index];
            const fileDepositoryActivities = response.data.activities.filter(
              (activity: any): activity is FileDepositoryActivity => activity.activityType === 'file-depository'
            ).map(activity => ({
              ...activity,
              courseSlug: course.slug
            }));
            allActivities.push(...fileDepositoryActivities);
          }
        });

        // Sort by due date (soonest first) and creation date
        allActivities.sort((a, b) => {
          if (a.dueAt && b.dueAt) {
            return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
          }
          if (a.dueAt && !b.dueAt) return -1;
          if (!a.dueAt && b.dueAt) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Filter out activities where student has already submitted
        this.filterUnsubmittedActivities(allActivities);
      }),
      catchError(error => this.handleError(error)),
      // Transform the response to match expected format
      tap(() => {}),
      catchError(() => {
        // If there's an error, set empty activities
        this._studentActivities.set([]);
        return new Observable(subscriber => {
          subscriber.next({ success: true, data: { activities: [] } });
          subscriber.complete();
        });
      })
    ) as Observable<ApiResponse<{ activities: (FileDepositoryActivity & {courseSlug: string})[] }>>;
  }

  // Filter activities to only show unsubmitted ones
  private filterUnsubmittedActivities(activities: (FileDepositoryActivity & {courseSlug: string})[]): void {
    if (activities.length === 0) {
      this._studentActivities.set([]);
      return;
    }

    // Check submission status for each activity
    const submissionChecks = activities.map(activity =>
      this.depositedFilesService.getMyDeposit(activity._id).pipe(
        catchError((error) => {
          // API error - treat as no submission
          return of({ deposit: null, activity: { id: '', title: '', maxFiles: 0 } } as MyDepositedFilesResponse);
        })
      )
    );

    forkJoin(submissionChecks).subscribe({
      next: (results) => {
        // Filter out activities where a submission exists (deposit is not null)
        const unsubmittedActivities = activities.filter((activity, index) => {
          const submissionResponse = results[index];
          const hasSubmission = submissionResponse && submissionResponse.deposit !== null;
          
          // Only include activities where there's no submission (deposit is null)
          return !hasSubmission;
        });

        this._studentActivities.set(unsubmittedActivities);
      },
      error: (error) => {
        console.error('Error checking submissions, showing all activities as fallback:', error);
        // If there's an error checking submissions, show all activities as fallback
        this._studentActivities.set(activities);
      }
    });
  }

  // Refresh dashboard data
  refreshDashboard(): Observable<ApiResponse<any>> {
    return this.init();
  }

  // Clear dashboard data
  clearDashboardData(): void {
    this._currentCourse.set(null);
    this._upcomingCourses.set([]);
    this._teacherActivities.set([]);
    this._studentActivities.set([]);
    this._error.set(null);
  }

  // Utility methods
  clearError(): void {
    this._error.set(null);
  }

  // Get dashboard stats for teacher
  getTeacherStats() {
    return computed(() => ({
      totalActivities: this.totalTeacherActivities(),
      pendingFeedback: this.pendingFeedback(),
      missingDeposits: this.missingDeposits(),
      totalCourses: this.totalUpcomingCourses() + (this._currentCourse() ? 1 : 0)
    }));
  }

  // Get dashboard stats for student
  getStudentStats() {
    return computed(() => {
      const activities = this._studentActivities();
      const now = new Date();

      const upcomingDeposits = activities.filter(activity => {
        return activity.dueAt && new Date(activity.dueAt) > now;
      }).length;

      const overdueDeposits = activities.filter(activity => {
        return activity.dueAt && new Date(activity.dueAt) < now;
      }).length;

      return {
        totalActivities: this.totalStudentActivities(),
        upcomingDeposits,
        overdueDeposits,
        totalCourses: this.totalUpcomingCourses() + (this._currentCourse() ? 1 : 0)
      };
    });
  }

  // Error handling
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error?.error?.message) {
      errorMessage = error.error.error.message;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this._error.set(errorMessage);
    return throwError(() => error);
  }
}
