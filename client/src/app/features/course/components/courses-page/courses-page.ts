import {Component, inject, OnInit, signal} from '@angular/core';
import {SidebarLayout} from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {InputComponent} from '@/shared/components/ui/input/input';
import {LucideAngularModule} from 'lucide-angular';
import {CourseUnitsService} from '@/core/services/course-units.service';
import {CourseUnit, CourseUnitsResponse} from '@/core/models/course-unit.models';
import {AuthService} from '@/core/services/auth.service';
// import {CourseCard} from '@/shared/components/ui/course-card/course-card';
import { CourseBox } from '@/shared/components/ui/course-box/course-box';

@Component({
  selector: 'app-courses-page',
  imports: [
    SidebarLayout,
    InputComponent,
    LucideAngularModule,
    CourseBox
  ],
  templateUrl: './courses-page.html',
})
export class CoursesPage implements OnInit {

  private readonly coursesService = inject(CourseUnitsService);
  private readonly authService = inject(AuthService);
  private userCourses = signal<CourseUnit[] | null>(null);

  ngOnInit(): void {
    this.loadUserCourses();
  }

  private loadUserCourses(): void {
    this.coursesService.getUserCourseUnits().subscribe({
      next: (response) => {
        if (response.success) {
          this.userCourses.set(response.data.courseUnits);
        }
      },
      error: (error) => {
        console.error('Failed to load user courses:', error);
      }
    });
  }

  get courses() {
    return this.userCourses();
  }


}
