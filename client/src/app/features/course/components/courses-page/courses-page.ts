import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseBox } from '@/features/course/components/courses-page/course-box/course-box';
import { CourseUnit } from '@/core/models/course-unit.models';
import { CourseUnitsService } from '@/core/services/course-units.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-courses-page',
  imports: [CommonModule, CourseBox, LucideAngularModule],
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
