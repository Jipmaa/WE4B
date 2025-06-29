import {Component, computed, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarLayout } from '@/shared/components/layout/sidebar-layout/sidebar-layout';
import {AuthService} from '@/core/services/auth.service';
import {CourseBox} from '@/shared/components/ui/course-box/course-box';
import { DashboardService } from '../../services';
import {DepositDetailsForTeacher} from '@/core/models/_shared.models';
import {LucideAngularModule} from 'lucide-angular';
import {Activity} from '@/shared/components/ui/activity/activity';
import { RecentActivitySidebar } from '@/shared/components/ui/recent-activity-sidebar/recent-activity-sidebar';




@Component({
  selector: 'app-dashboard-page',
  imports: [
    CommonModule,
    SidebarLayout,
    CourseBox,
    LucideAngularModule,
    Activity,
    RecentActivitySidebar,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage implements OnInit {

  readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  readonly isTeacher = this.authService.isTeacher;
  readonly currentCourse = this.dashboardService.currentCourse;  // type CourseUnit
  readonly upcomingCourses = this.dashboardService.upcomingCourses;  // type CourseUnit[]
  readonly teacherActivities = this.dashboardService.teacherActivities;  // type DepositDetailsForTeacher[]
  readonly studentActivities = this.dashboardService.studentActivities;  // type FileDepositoryActivity[]

  readonly activities = computed(() =>
    this.isTeacher() ? this.teacherActivities() : this.studentActivities()
  );

  ngOnInit() {
    this.authService.getCurrentUser().subscribe()
    this.dashboardService.init().subscribe();
  }

  formatDueAt(homework: DepositDetailsForTeacher, mode: 'teacher' = 'teacher'): string {
    if (!homework.dueAt) {
      return 'Aucune date limite';
    }

    const dueDate = new Date(homework.dueAt);
    const now = new Date();
    const diffInMs = dueDate.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: "short" });
    const isTeacher = mode === 'teacher';

    // Il y a x jours || Dans x jours
    if (diffInDays < 0) {
      return `${isTeacher ? 'Cloturé' : 'À rendre' } il y a ${rtf.format(diffInDays, 'day')}`; // Il y a x jours
    } else if (diffInDays === 0) {
      return `${isTeacher ? 'Cloture' : 'À rendre'} aujourd'hui`;
    } else if (diffInDays === 1) {
      return `${isTeacher ? 'Cloture' : 'À rendre'} Demain`;
    } else {
      return `${isTeacher ? 'Cloture' : 'À rendre'} dans ${rtf.format(diffInDays, 'day')}`; // Dans x jours
    }
  }

  getDueDateStatusClass(homework: DepositDetailsForTeacher): string {
    if (!homework.dueAt) {
      return '';
    }

    const dueDate = new Date(homework.dueAt);
    const now = new Date();
    const diffInMs = dueDate.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) {
      return 'text-red-600'; // Overdue
    }
    return ''
  }
}
