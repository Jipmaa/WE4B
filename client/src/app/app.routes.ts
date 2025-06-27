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
    canActivate: [authGuard],
    loadChildren: () => import('./features/course/course.routes').then(m => m.courseRoutes)
  },
  {
    path: 'forum',
    canActivate: [authGuard],
    loadChildren: () => import('./features/forum/forum.routes').then(m => m.FORUM_ROUTES)
  },

  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  }

];
