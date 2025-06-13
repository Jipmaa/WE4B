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
  }

];
