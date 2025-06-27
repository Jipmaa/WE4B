import {Component, Input} from '@angular/core';
import {CourseUnit} from '@/core/models/course-unit.models';
import {AuthImageComponent} from '@/shared/components/ui/auth-image/auth-image.component';

@Component({
  selector: 'app-course-card',
  imports: [
    AuthImageComponent
  ],
  templateUrl: './course-card.html',
})
export class CourseCard {

  @Input({required:true}) course!: CourseUnit;
  @Input() variant: 'with-image' | 'compact' = 'compact';

}
