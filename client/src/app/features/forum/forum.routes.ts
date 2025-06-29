import { Routes } from '@angular/router';
import { DiscussionCreationComponent } from './components/discussion-creation/discussion-creation.component';

import { DiscussionPageComponent } from './components/discussion-page/discussion-page.component';

export const FORUM_ROUTES: Routes = [
  {
    path: '',
    component: DiscussionPageComponent,
    pathMatch: 'full'
  },
  {
    path: 'new',
    component: DiscussionCreationComponent
  }
];
