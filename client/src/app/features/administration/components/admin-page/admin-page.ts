import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPage {

}
