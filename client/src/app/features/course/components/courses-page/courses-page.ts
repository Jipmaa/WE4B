import { Component, OnInit } from '@angular/core';
import {CourseBox} from '@/features/course/components/courses-page/course-box/course-box';
import {SidebarLayout} from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {InputComponent} from '@/shared/components/ui/input/input';
import {LucideAngularModule} from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { CourseUnit } from '@/core/models/course-unit.models';
import { CourseUnitsService } from '@/core/services/course-units.service';

@Component({
  selector: 'app-courses-page',
  imports: [CommonModule, CourseBox, SidebarLayout, InputComponent, LucideAngularModule],
  templateUrl: './courses-page.html',
})
export class CoursesPage implements OnInit {

  CourseArray !: CourseUnit[]

  constructor(public servCourse: CourseUnitsService) {
    this.servCourse.getCourseUnits().subscribe(
      response => {
        console.log(response);
        this.CourseArray = response.data.courseUnits;
      }
    )
  }

  ngOnInit(): void {

  }
}
