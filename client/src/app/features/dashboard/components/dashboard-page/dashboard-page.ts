import {Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarLayout } from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {Activity} from '@/shared/components/ui/activity/activity';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CommonModule,
    SidebarLayout,
    Activity,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
}
