import { Component, OnInit, inject, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForumService } from '../../../../core/services/forum.service';
import { Discussion } from '../../../../core/models/discussion.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-discussion-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './discussion-list.component.html',
})
export class DiscussionListComponent implements OnInit, OnDestroy {
  private readonly forumService = inject(ForumService);
  private discussionUpdateSubscription: Subscription | undefined;

  @Output() discussionSelected = new EventEmitter<string>();
  @Input() selectedDiscussionId: string | null = null;

  discussions: Discussion[] = [];
  error: string | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.loadDiscussions();
    this.discussionUpdateSubscription = this.forumService.discussionUpdated$.subscribe(() => {
      this.loadDiscussions();
    });
  }

  ngOnDestroy(): void {
    this.discussionUpdateSubscription?.unsubscribe();
  }

  loadDiscussions(): void {
    this.isLoading = true;
    this.forumService.getAllDiscussions().subscribe({
      next: (discussions) => {
        this.discussions = discussions;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = `Erreur lors du chargement des discussions : ${err.message}`;
        this.isLoading = false;
      }
    });
  }

  viewDiscussion(id: string): void {
    this.discussionSelected.emit(id);
  }
}
