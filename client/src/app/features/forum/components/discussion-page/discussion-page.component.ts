import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiscussionListComponent } from '../discussion-list/discussion-list.component';
import { DiscussionViewComponent } from '../discussion-view/discussion-view.component';
import { DiscussionCreationComponent } from '../discussion-creation/discussion-creation.component';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { SidebarLayout } from '@/shared/components/layout/sidebar-layout/sidebar-layout';

@Component({
  selector: 'app-discussion-page',
  standalone: true,
  imports: [CommonModule, DiscussionListComponent, DiscussionViewComponent, DiscussionCreationComponent, IconButtonComponent, SidebarLayout],
  templateUrl: './discussion-page.component.html',
})
export class DiscussionPageComponent {
  selectedDiscussionId: string | null = null;
  showCreationForm: boolean = false;
  discussionViewTitle: string = '';

  onNewDiscussionClick(): void {
    this.selectedDiscussionId = null;
    this.showCreationForm = true;
  }

  onDiscussionSelected(discussionId: string | null): void {
    this.selectedDiscussionId = discussionId;
    this.showCreationForm = false; // Hide creation form if a discussion is selected
  }

  onCloseDiscussion(): void {
    this.selectedDiscussionId = null;
  }

  onDiscussionCreated(discussionId: string): void {
    this.selectedDiscussionId = discussionId;
    this.showCreationForm = false; // Hide creation form after creation
  }
}
