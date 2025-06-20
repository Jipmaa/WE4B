import { Routes } from '@angular/router';
import {adminGuard, authGuard, guestGuard} from '@/core/guards/auth.guards';

export const routes: Routes = [

  {
    path: 'accounts',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/accounts/accounts.routes').then(m => m.accountsRoutes)
  },
  {
    path: 'administration',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/administration/administration.routes').then(m => m.administrationRoutes)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
  },
  {
    path: 'courses',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/course/course.routes').then(m => m.courseRoutes)
  },

  {
    path: 'register',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/registers/components/register.routes').then(m => m.registersRoutes)
  },

  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  }

];
