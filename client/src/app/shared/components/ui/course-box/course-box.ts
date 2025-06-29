import {Component, Input} from '@angular/core';
import {CourseUnit} from '@/core/models/course-unit.models';
import {AuthImageComponent} from '@/shared/components/ui/auth-image/auth-image.component';

@Component({
  selector: 'app-course-box',
  imports: [
    AuthImageComponent
  ],
  templateUrl: './course-box.html',
})
export class CourseBox {

  @Input({required:true}) course!: CourseUnit;
  @Input() showImage: boolean = false;
  @Input() variant: 'with-image' | 'compact' = 'compact';

}
