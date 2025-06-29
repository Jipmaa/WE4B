import {Component, inject, OnInit, signal} from '@angular/core';
import {SidebarLayout} from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {InputComponent} from '@/shared/components/ui/input/input';
import {LucideAngularModule} from 'lucide-angular';
import {CourseUnitsService} from '@/core/services/course-units.service';
import {CourseUnit} from '@/core/models/course-unit.models';
import {AuthService} from '@/core/services/auth.service';
// import {CourseCard} from '@/shared/components/ui/course-card/course-card';
import { CourseBox } from '@/shared/components/ui/course-box/course-box';
import {IconButtonComponent} from '@/shared/components/ui/icon-button/icon-button';
import { UserPreferencesService } from '@/core/services/user-preferences.service';
import { RecentActivitySidebar } from '@/shared/components/ui/recent-activity-sidebar/recent-activity-sidebar';

@Component({
  selector: 'app-courses-page',
  imports: [
    SidebarLayout,
    InputComponent,
    LucideAngularModule,
    CourseBox,
    IconButtonComponent,
    RecentActivitySidebar
  ],
  templateUrl: './courses-page.html',
})
export class CoursesPage implements OnInit {

  private readonly coursesService = inject(CourseUnitsService);
  private readonly authService = inject(AuthService);
  private readonly userPreferencesService = inject(UserPreferencesService);

  private userCourses = signal<CourseUnit[] | null>(null);
  private showImagesPreference = this.userPreferencesService.createPreferenceSignal('show-course-images');
  readonly showImages = this.showImagesPreference.signal;

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

  public switchShowImages(): void{
    this.showImagesPreference.update(old => !old);
  }



}
