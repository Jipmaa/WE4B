import {Component, Input} from '@angular/core';
import {PopulatedGroupUser} from '@/core/models/course-group.models';
import {AuthImageComponent} from '@/shared/components/ui/auth-image/auth-image.component';

@Component({
  selector: 'app-user-card',
  imports: [
    AuthImageComponent
  ],
  templateUrl: './user-card.html',
  styles: `
    :host {
      @apply contents;
    }
  `
})
export class UserCard {

  @Input({ required: true }) data!: PopulatedGroupUser;

  get semesterDescription() {
    if ([1, 2].includes(this.data.semester) && this.data.year?.length > 1) {
      return `Inscrit pour le semestre ${this.data.semester} (${this.data.year})`;
    }
    return 'Inscription permanente';
  }

  get initials() {
    if (!this.data.user) return '';
    const firstName = this.data.user.firstName || '';
    const lastName = this.data.user.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }

}
