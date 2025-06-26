import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {NgClass} from '@angular/common';
@Component({
  selector: 'app-activity',
  imports: [
    LucideAngularModule,
    NgClass
  ],
  templateUrl: './activity.html',
})
export class Activity {
  @Input() title: string = '[Message]';
  @Input() deadline: number = 3;
  @Input() content: string = '[Content]';
  @Input() short: boolean = true;
  @Input() alert: boolean = false;
  isPinned: boolean = false;

  togglePin() {
    this.isPinned = !this.isPinned;
  }
}
