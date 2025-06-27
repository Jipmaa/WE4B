import { Routes } from '@angular/router';
import { DiscussionViewComponent } from './components/discussion-view/discussion-view.component';
import { DiscussionListComponent } from './components/discussion-list/discussion-list.component';
import { DiscussionCreationComponent } from './components/discussion-creation/discussion-creation.component';

export const FORUM_ROUTES: Routes = [
  {
    path: '',
    component: DiscussionListComponent,
    pathMatch: 'full'
  },
  {
    path: 'new',
    component: DiscussionCreationComponent
  },
  {
    path: 'discussions/:id',
    component: DiscussionViewComponent
  }
];
