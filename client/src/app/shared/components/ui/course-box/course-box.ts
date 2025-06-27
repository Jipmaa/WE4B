import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CourseUnit } from '@/core/models/course-unit.models';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-course-box',
  imports: [CommonModule],
  templateUrl: './course-box.html',
  host: {
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut()'
  }
})
export class CourseBox {
  @Input() course?: CourseUnit;
  @Input() showImage: boolean = true;

  isHovered = false;
  imageError = false;

  constructor(private router: Router) {}

  navigateToCourse() {
    if (this.course) {
      // Navigation vers la page du cours avec le slug
      this.router.navigate(['/courses', this.course.slug]);
    }
  }

  onMouseEnter() {
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
  }

  onFocusIn() {
    this.isHovered = true;
  }

  onFocusOut() {
    this.isHovered = false;
  }

  onImageError() {
    this.imageError = true;
  }

  getCode(): string {
    // Priorité au code passé en input
    if (this.course?.code) {
      return this.course.code;
    }
    // Valeur par défaut
    return 'Code du cours';
  }

}
