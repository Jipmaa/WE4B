import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiscussionListComponent } from '../discussion-list/discussion-list.component';
import { DiscussionViewComponent } from '../discussion-view/discussion-view.component';
import { DiscussionCreationComponent } from '../discussion-creation/discussion-creation.component';

@Component({
  selector: 'app-discussion-page',
  standalone: true,
  imports: [CommonModule, DiscussionListComponent, DiscussionViewComponent, DiscussionCreationComponent],
  templateUrl: './discussion-page.component.html',
})
export class DiscussionPageComponent {
  selectedDiscussionId: string | null = null;
  showCreationForm: boolean = false;

  onNewDiscussionClick(): void {
    this.selectedDiscussionId = null;
    this.showCreationForm = true;
  }

  onDiscussionSelected(discussionId: string): void {
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
