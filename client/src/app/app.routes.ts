import { Routes } from '@angular/router';
import {guestGuard} from '@/core/guards/auth.guards';

export const routes: Routes = [

  {
    path: 'accounts',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/accounts/accounts.routes').then(m => m.accountsRoutes)
  },

];
