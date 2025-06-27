import { Component, OnInit, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForumService } from '@/core/services/forum.service';
import { Discussion } from '@/core/models/discussion.models';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-discussion-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './discussion-view.component.html',
})
export class DiscussionViewComponent implements OnInit, OnChanges {
  private readonly forumService = inject(ForumService);

  @Input() discussionId!: string;

  discussion: Discussion | null = null;
  newMessageContent = '';
  error: string | null = null;
  isLoading = true;

  ngOnInit(): void {
    // Initial load if discussionId is already set (e.g., from route resolver, though not used here anymore)
    if (this.discussionId) {
      this.loadDiscussion(this.discussionId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['discussionId'] && changes['discussionId'].currentValue) {
      this.loadDiscussion(changes['discussionId'].currentValue);
    } else if (changes['discussionId'] && !changes['discussionId'].currentValue) {
      // Clear discussion if discussionId becomes null (e.g., when closing the view)
      this.discussion = null;
      this.error = null;
      this.isLoading = false;
    }
  }

  loadDiscussion(id: string): void {
    this.isLoading = true;
    this.error = null;
    this.forumService.getDiscussionById(id).subscribe({
      next: (discussion) => {
        this.discussion = discussion;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = `Erreur lors du chargement de la discussion : ${err.message}`;
        this.isLoading = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.discussionId) {
      return;
    }

    this.forumService.addMessageToDiscussion(this.discussionId, this.newMessageContent).subscribe({
      next: () => {
        // Reload the discussion to display the new message.
        this.loadDiscussion(this.discussionId);
        this.newMessageContent = ''; // Clear the input field
      },
      error: (err) => {
        this.error = `Erreur lors de l'envoi du message : ${err.message}`;
      }
    });
  }
}
