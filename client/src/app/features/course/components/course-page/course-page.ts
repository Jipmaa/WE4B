import {Component, inject, computed, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { LucideAngularModule } from "lucide-angular";
import { SidebarLayout } from "@/shared/components/layout/sidebar-layout/sidebar-layout";
import { ButtonComponent } from '@/shared/components/ui/button/button';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { AuthService } from '@/core/services/auth.service';
import { CourseUnitsService } from '@/core/services/course-units.service';
import {Collapsible} from '@/shared/components/ui/collapsible/collapsible';
import { ActivityPopup } from '../activity-popup/activity-popup';
import {Activity} from '@/shared/components/ui/activity/activity';
import { CourseActivity } from '@/core/models/course-activity.models';

@Component({
  selector: 'app-course-page',
  imports: [
    LucideAngularModule,
    SidebarLayout,
    ButtonComponent,
    IconButtonComponent,
    Collapsible,
    ActivityPopup,
    Activity
  ],
  templateUrl: './course-page.html',
})
export class CoursePage {
  private readonly authService = inject(AuthService);
  private readonly courseUnitsService = inject(CourseUnitsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Get course slug from route parameter reactively
  readonly courseSlug = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('slug') || '')
    ),
    { initialValue: '' }
  );

  // Get current course unit by calling the API when slug changes
  readonly currentCourseUnit = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('slug') || ''),
      switchMap(slug => {
        if (!slug) {
          throw new Error('Course slug is required');
        }
        return this.courseUnitsService.getUserCourseUnitBySlug(slug);
      }),
      map(response => response.success ? response.data.courseUnit : null)
    ),
    { initialValue: null }
  );

  readonly pinnedActivities = computed(
    () => this.courseUnit?.activities?.flatMap(
      category => category.activities
    ).filter(activity => activity.isPinned) || []
  );

  readonly recentActivities = computed(
    () => this.courseUnit?.activities?.flatMap(
      category => category.activities
    ).sort((a, b) => {
      const aDate = a.createdAt || a.updatedAt;
      const bDate = b.createdAt || b.updatedAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    }).slice(0, 4) || []
  );

  readonly isLoading = computed(() => {
    return this.courseUnitsService.isLoading() || this.authService.isLoading();
  });

  // Popup state
  readonly showAddActivityPopup = signal(false);
  readonly showEditActivityPopup = signal(false);
  readonly editingActivity = signal<CourseActivity | null>(null);

  get courseUnit() {
    return this.currentCourseUnit();
  }

  // Helper method for template usage - checks role within this specific course
  isTeacherOrAdminInCourse(): boolean {
    // Global admins can always manage any course
    if (this.authService.isAdmin()) {
      return true;
    }

    // Check user's role within this specific course
    const courseUnit = this.currentCourseUnit();
    if (courseUnit?.userRole) {
      return courseUnit.userRole === 'teacher';
    }

    return false;
  }

  async onClickMembersList() {
    await this.router.navigate(['/courses', this.courseSlug(), 'members']);
  }

  async onAddGroup() {
    await this.router.navigate(['/courses', this.courseSlug(), 'add-group']);
  }

  onAddActivity() {
    this.showAddActivityPopup.set(true);
  }

  onCloseAddActivityPopup() {
    this.showAddActivityPopup.set(false);
  }

  onActivityCreated() {
    this.showAddActivityPopup.set(false);
  }

  onActivityUpdated() {
    this.showEditActivityPopup.set(false);
    this.editingActivity.set(null);
  }

  onEditActivity(activity: CourseActivity) {
    this.editingActivity.set(activity);
    this.showEditActivityPopup.set(true);
  }

  onCloseEditActivityPopup() {
    this.showEditActivityPopup.set(false);
    this.editingActivity.set(null);
  }

  onCategoryCreated(newCategory: any) {
    // Add the new category to the current course unit's activities list
    const currentCourseUnit = this.currentCourseUnit();
    if (currentCourseUnit) {
      const updatedCourseUnit = {
        ...currentCourseUnit,
        activities: [...(currentCourseUnit.activities || []), newCategory]
      };
      // Update the signal with the new course unit data
      // Note: This is a temporary update until the next data refresh
      // The actual category will be created when an activity is added to it
    }
  }
}
