import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { Observable } from 'rxjs';
import { SidebarLayout } from "@/shared/components/layout/sidebar-layout/sidebar-layout";
import { Router } from '@angular/router';

interface LogEntry {
  _id: string;
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

interface LoginHistoryEntry {
  _id: string;
  userId: { _id: string; firstName: string; lastName: string; email: string };
  loginTime: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  logoutTime?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalLogs?: number;
  totalLoginHistory?: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

@Component({
  selector: 'app-activity-logs-page',
  standalone: true,
  imports: [CommonModule, SidebarLayout],
  templateUrl: './activity-logs-page.component.html',
})
export class ActivityLogsPageComponent implements OnInit {
  activityLogs: LogEntry[] = [];
  loginHistory: LoginHistoryEntry[] = [];
  activityLogsPagination: Pagination | null = null;
  loginHistoryPagination: Pagination | null = null;
  activeTab: 'activity' | 'login' = 'activity';

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    if (!this.authService.canAccess(['admin'])) {
      this.router.navigate(['/unauthorized']);
      return;
    }
    this.loadActivityLogs();
    this.loadLoginHistory();
  }

  loadActivityLogs(page: number = 1, limit: number = 10): void {
    this.http.get<any>(`${environment.apiUrl}/logs/activity?page=${page}&limit=${limit}`)
      .subscribe(response => {
        this.activityLogs = response.data.logs;
        this.activityLogsPagination = response.data.pagination;
      });
  }

  loadLoginHistory(page: number = 1, limit: number = 10): void {
    this.http.get<any>(`${environment.apiUrl}/logs/login-history?page=${page}&limit=${limit}`)
      .subscribe(response => {
        this.loginHistory = response.data.loginHistory;
        this.loginHistoryPagination = response.data.pagination;
      });
  }

  changeTab(tab: 'activity' | 'login'): void {
    this.activeTab = tab;
  }

  onActivityPageChange(page: number): void {
    if (this.activityLogsPagination && page >= 1 && page <= this.activityLogsPagination.totalPages) {
      this.loadActivityLogs(page, this.activityLogsPagination.limit);
    }
  }

  onLoginHistoryPageChange(page: number): void {
    if (this.loginHistoryPagination && page >= 1 && page <= this.loginHistoryPagination.totalPages) {
      this.loadLoginHistory(page, this.loginHistoryPagination.limit);
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  getMetadataKeys(metadata: any): string[] {
    return Object.keys(metadata || {});
  }
}
