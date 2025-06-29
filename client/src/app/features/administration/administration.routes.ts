import {Routes} from '@angular/router';
import {AdminPage} from '@/features/administration/components/admin-page/admin-page';
import { ActivityLogsPageComponent } from './components/activity-logs-page/activity-logs-page.component';
import { adminGuard } from '../../core/guards/auth.guards';

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
