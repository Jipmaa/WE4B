import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/../environments/environment';
import { AuthService } from '@/core/services/auth.service';
import { SidebarLayout } from "@/shared/components/layout/sidebar-layout/sidebar-layout";
import { Router } from '@angular/router';
import {TabContentComponent, TabItemComponent, TabsComponent} from '@/shared/components/ui/tabs';
import { ArrayComponent, Column, LoadingState } from '@/shared/components/ui/array/array';

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
  imports: [CommonModule, SidebarLayout, TabsComponent, TabItemComponent, TabContentComponent, ArrayComponent],
  templateUrl: './activity-logs-page.component.html',
})
export class ActivityLogsPageComponent implements OnInit {
  activityLogs: LogEntry[] = [];
  loginHistory: LoginHistoryEntry[] = [];
  activityLogsPagination: Pagination | null = null;
  loginHistoryPagination: Pagination | null = null;
  activeTab: 'activity' | 'login' = 'activity';

  activityLogsColumns: Column[] = [
    { label: 'Timestamp', mapToKey: 'timestamp', render: (item: LogEntry) => this.formatTimestamp(item.timestamp) },
    { label: 'Niveau', mapToKey: 'level' },
    { label: 'Message', mapToKey: 'message' },
    { label: 'User ID', mapToKey: 'userId', render: (item: LogEntry) => item.metadata?.userId || 'N/A' },
    { label: 'Métadonnées', mapToKey: 'metadata', render: (item: LogEntry) => this.formatMetadata(item.metadata) }
  ];

  loginHistoryColumns: Column[] = [
    { label: 'Timestamp', mapToKey: 'loginTime', render: (item: LoginHistoryEntry) => this.formatTimestamp(item.loginTime) },
    { label: 'Utilisateur', mapToKey: 'user', render: (item: LoginHistoryEntry) => `${item.userId.firstName} ${item.userId.lastName} (${item.userId.email})` },
    { label: '@ IP', mapToKey: 'ipAddress', render: (item: LoginHistoryEntry) => item.ipAddress || 'N/A' },
    { label: 'User Agent', mapToKey: 'userAgent', render: (item: LoginHistoryEntry) => this.formatUserAgent(item.userAgent) },
    { label: 'Réussit', mapToKey: 'success', render: (item: LoginHistoryEntry) => item.success ? 'Oui' : 'Non' },
    { label: 'Déconnexion', mapToKey: 'logoutTime', render: (item: LoginHistoryEntry) => item.logoutTime ? this.formatTimestamp(item.logoutTime) : 'N/A' }
  ];

  activityLogsLoadingState: LoadingState = {
    isLoading: false,
    hasError: false,
    allLoaded: false
  };

  loginHistoryLoadingState: LoadingState = {
    isLoading: false,
    hasError: false,
    allLoaded: false
  };

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
    this.activityLogsLoadingState.isLoading = true;
    this.activityLogsLoadingState.hasError = false;

    this.http.get<any>(`${environment.apiUrl}/logs/activity?page=${page}&limit=${limit}`)
      .subscribe({
        next: response => {
          if (page === 1) {
            this.activityLogs = response.data.logs;
          } else {
            this.activityLogs = [...this.activityLogs, ...response.data.logs];
          }
          this.activityLogsPagination = response.data.pagination;
          this.activityLogsLoadingState.isLoading = false;
          this.activityLogsLoadingState.allLoaded = !response.data.pagination.hasNextPage;
        },
        error: () => {
          this.activityLogsLoadingState.isLoading = false;
          this.activityLogsLoadingState.hasError = true;
        }
      });
  }

  loadLoginHistory(page: number = 1, limit: number = 10): void {
    this.loginHistoryLoadingState.isLoading = true;
    this.loginHistoryLoadingState.hasError = false;

    this.http.get<any>(`${environment.apiUrl}/logs/login-history?page=${page}&limit=${limit}`)
      .subscribe({
        next: response => {
          if (page === 1) {
            this.loginHistory = response.data.loginHistory;
          } else {
            this.loginHistory = [...this.loginHistory, ...response.data.loginHistory];
          }
          this.loginHistoryPagination = response.data.pagination;
          this.loginHistoryLoadingState.isLoading = false;
          this.loginHistoryLoadingState.allLoaded = !response.data.pagination.hasNextPage;
        },
        error: () => {
          this.loginHistoryLoadingState.isLoading = false;
          this.loginHistoryLoadingState.hasError = true;
        }
      });
  }

  changeTab(tab: 'activity' | 'login'): void {
    this.activeTab = tab;
  }

  onActivityLogsLoadMore(): void {
    if (this.activityLogsPagination && this.activityLogsPagination.hasNextPage) {
      this.loadActivityLogs(this.activityLogsPagination.currentPage + 1, this.activityLogsPagination.limit);
    }
  }

  onLoginHistoryLoadMore(): void {
    if (this.loginHistoryPagination && this.loginHistoryPagination.hasNextPage) {
      this.loadLoginHistory(this.loginHistoryPagination.currentPage + 1, this.loginHistoryPagination.limit);
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  formatMetadata(metadata: any): string {
    if (!metadata || Object.keys(metadata).length === 0) {
      return 'N/A';
    }

    const filteredMetadata = Object.keys(metadata)
      .filter(key => key !== 'userId')
      .map(key => `<strong>${key}:</strong> ${metadata[key]}`)
      .join('<br>');

    return filteredMetadata || 'N/A';
  }

  formatUserAgent(userAgent?: string): string {
    if (!userAgent) {
      return 'N/A';
    }

    // Extract browser and OS information
    let browser = 'Unknown';
    let os = 'Unknown';

    // Browser detection
    if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
      const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
      browser = chromeMatch ? `Chrome ${chromeMatch[1]}` : 'Chrome';
    } else if (userAgent.includes('Firefox/')) {
      const firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
      browser = firefoxMatch ? `Firefox ${firefoxMatch[1]}` : 'Firefox';
    } else if (userAgent.includes('Edg/')) {
      const edgeMatch = userAgent.match(/Edg\/(\d+)/);
      browser = edgeMatch ? `Edge ${edgeMatch[1]}` : 'Edge';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
      const safariMatch = userAgent.match(/Version\/(\d+)/);
      browser = safariMatch ? `Safari ${safariMatch[1]}` : 'Safari';
    }

    // OS detection
    if (userAgent.includes('Windows NT')) {
      const windowsMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
      if (windowsMatch) {
        const version = windowsMatch[1];
        if (version === '10.0') os = 'Windows 10/11';
        else if (version === '6.3') os = 'Windows 8.1';
        else if (version === '6.2') os = 'Windows 8';
        else if (version === '6.1') os = 'Windows 7';
        else os = `Windows ${version}`;
      } else {
        os = 'Windows';
      }
    } else if (userAgent.includes('Mac OS X')) {
      const macMatch = userAgent.match(/Mac OS X (\d+_\d+)/);
      os = macMatch ? `macOS ${macMatch[1].replace('_', '.')}` : 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      const androidMatch = userAgent.match(/Android (\d+)/);
      os = androidMatch ? `Android ${androidMatch[1]}` : 'Android';
    } else if (userAgent.includes('iPhone OS')) {
      const iosMatch = userAgent.match(/iPhone OS (\d+_\d+)/);
      os = iosMatch ? `iOS ${iosMatch[1].replace('_', '.')}` : 'iOS';
    }

    return `${browser} sur ${os}`;
  }
}
