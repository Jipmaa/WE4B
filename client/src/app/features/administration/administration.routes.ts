import {Routes} from '@angular/router';
import {AdminPage} from '@/features/administration/components/admin-page/admin-page';
import { ActivityLogsPageComponent } from './components/activity-logs-page/activity-logs-page.component';

export const administrationRoutes: Routes = [
  {
    path: '',
    component: AdminPage,
  },
  {
    path: 'activity-logs',
    component: ActivityLogsPageComponent
  }
]
