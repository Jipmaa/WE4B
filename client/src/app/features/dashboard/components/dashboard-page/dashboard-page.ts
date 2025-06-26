import {Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarLayout } from '@/shared/components/layout/sidebar-layout/sidebar-layout';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CommonModule,
    SidebarLayout,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {

}
