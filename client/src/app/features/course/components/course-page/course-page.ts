import { Component, inject, computed } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CourseBox } from "@/features/course/components/courses-page/course-box/course-box";
import { LucideAngularModule } from "lucide-angular";
import { SidebarLayout } from "@/shared/components/layout/sidebar-layout/sidebar-layout";
import { ButtonComponent } from '@/shared/components/ui/button/button';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { AuthService } from '@/core/services/auth.service';
import { CourseUnitsService } from '@/core/services/course-units.service';
import {Activity} from '@/activity/activity';

@Component({
  selector: 'app-course-page',
  imports: [
    CourseBox,
    LucideAngularModule,
    SidebarLayout,
    ButtonComponent,
    IconButtonComponent,
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

  // Get current course unit (access is already validated by guard)
  readonly currentCourseUnit = computed(() => {
    const slug = this.courseSlug();
    return this.courseUnitsService.getUserCourseUnitBySlug(slug);
  });

  readonly isLoading = computed(() => {
    return this.courseUnitsService.isLoadingUserCourseUnits() || this.authService.isLoading();
  });

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
}
