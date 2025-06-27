import { Component, inject, computed } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { LucideAngularModule } from "lucide-angular";
import { SidebarLayout } from "@/shared/components/layout/sidebar-layout/sidebar-layout";
import { ButtonComponent } from '@/shared/components/ui/button/button';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { AuthService } from '@/core/services/auth.service';
import { CourseUnitsService } from '@/core/services/course-units.service';
import {Activity} from '@/shared/components/ui/activity/activity';
import {Collapsible} from '@/shared/components/ui/collapsible/collapsible';

@Component({
  selector: 'app-course-page',
  imports: [
    LucideAngularModule,
    SidebarLayout,
    ButtonComponent,
    IconButtonComponent,
    Activity,
    Collapsible
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

  readonly isLoading = computed(() => {
    return this.courseUnitsService.isLoading() || this.authService.isLoading();
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
