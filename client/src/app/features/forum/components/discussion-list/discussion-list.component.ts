import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, Output, EventEmitter, OnDestroy, Input, computed } from '@angular/core';
import { ForumService } from '../../../../core/services/forum.service';
import { Discussion } from '../../../../core/models/discussion.models';
import { Subscription } from 'rxjs';
import { AuthService } from '@/core/services/auth.service';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';

@Component({
  selector: 'app-discussion-list',
  standalone: true,
  imports: [CommonModule, IconButtonComponent],
  templateUrl: './discussion-list.component.html',
})
export class DiscussionListComponent implements OnInit, OnDestroy {
  private readonly forumService = inject(ForumService);
  private readonly authService = inject(AuthService);
  private discussionUpdateSubscription: Subscription | undefined;

  @Output() discussionSelected = new EventEmitter<string | null>();
  @Input() selectedDiscussionId: string | null = null;

  discussions: Discussion[] = [];
  error: string | null = null;
  isLoading = true;

  isAdmin = computed(() => this.authService.isAdmin());

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

  onDeleteDiscussion(id: string): void {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette discussion ?')) {
      this.forumService.deleteDiscussion(id).subscribe({
        next: () => {
          this.loadDiscussions(); // Reload discussions after deletion
          if (this.selectedDiscussionId === id) {
            this.discussionSelected.emit(null); // Close the discussion if it was open
          }
        },
        error: (err) => {
          this.error = `Erreur lors de la suppression de la discussion : ${err.message}`;
        }
      });
    }
  }
}
