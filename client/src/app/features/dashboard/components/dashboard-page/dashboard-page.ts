import {Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarLayout } from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {CourseBox} from '@/shared/components/ui/course-box/course-box';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CommonModule,
    SidebarLayout,
    CourseBox,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
}
