import { Routes } from '@angular/router';
import {adminGuard, guestGuard} from '@/core/guards/auth.guards';

export const routes: Routes = [

  {
    path: 'accounts',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/accounts/accounts.routes').then(m => m.accountsRoutes)
  },
  {
    path: 'administrations',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/administration/administration.routes').then(m => m.administrationRoutes)
  },
  {
    path: 'dashboard',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
  },

  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  }

];
