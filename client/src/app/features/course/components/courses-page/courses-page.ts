import { Component } from '@angular/core';
import {CourseBox} from '@/features/course/components/courses-page/course-box/course-box';
import {SidebarLayout} from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {InputComponent} from '@/shared/components/ui/input/input';
import {LucideAngularModule} from 'lucide-angular';

@Component({
  selector: 'app-courses-page',
  imports: [CourseBox, SidebarLayout, InputComponent, LucideAngularModule],
  templateUrl: './courses-page.html',
})
export class CoursesPage {

}
