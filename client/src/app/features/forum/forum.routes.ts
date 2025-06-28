import { Routes } from '@angular/router';
import { DiscussionViewComponent } from './components/discussion-view/discussion-view.component';
import { DiscussionListComponent } from './components/discussion-list/discussion-list.component';
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
