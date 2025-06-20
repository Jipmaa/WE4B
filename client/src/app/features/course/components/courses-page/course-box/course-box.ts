import { Component, OnInit, Input } from '@angular/core';
import { CourseUnit } from '@/core/models/course-unit.models'; 

@Component({
  standalone: true,
  selector: 'app-course-box',
  imports: [],
  templateUrl: './course-box.html'
})
export class CourseBox implements OnInit{

  @Input() course !: CourseUnit

  constructor() {}

  ngOnInit(): void {
  }

}
