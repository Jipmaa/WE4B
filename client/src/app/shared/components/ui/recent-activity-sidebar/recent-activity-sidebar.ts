import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RecentActivityService } from '@/core/services/recent-activity.service';
import { TimeAgoPipe } from '@/shared/pipes/time-ago/time-ago.pipe';
import { AuthImageComponent } from '@/shared/components/ui/auth-image/auth-image.component';

@Component({
  selector: 'app-recent-activity-sidebar',
  imports: [
    CommonModule,
    LucideAngularModule,
    TimeAgoPipe,
    AuthImageComponent,
  ],
  templateUrl: './recent-activity-sidebar.html',
})
export class RecentActivitySidebar implements OnInit {
  public readonly recentActivityService = inject(RecentActivityService);
  readonly recentActivities = this.recentActivityService.activities;

  ngOnInit() {
    this.recentActivityService.getRecentActivities().subscribe();
  }
}