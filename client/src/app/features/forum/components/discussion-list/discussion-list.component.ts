import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, Output, EventEmitter, OnDestroy, Input, computed } from '@angular/core';
import { ForumService } from '@/core/services/forum.service';
import { Discussion } from '@/core/models/discussion.models';
import { Subscription } from 'rxjs';
import { AuthService } from '@/core/services/auth.service';
import { DeleteConfirmationPopupComponent } from '@/shared/components/ui/delete-confirmation-popup/delete-confirmation-popup';
import { ArrayComponent, Column, LoadingState, Messages, RowAction } from '@/shared/components/ui/array/array';

@Component({
  selector: 'app-discussion-list',
  standalone: true,
  imports: [CommonModule, ArrayComponent, DeleteConfirmationPopupComponent],
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

  showDeleteDiscussionPopup = false;
  discussionToDelete: Discussion | null = null;

  isAdmin = computed(() => this.authService.isAdmin());

  // Array component configuration
  columns: Column<Discussion>[] = [
    {
      label: 'Sujet',
      mapToKey: 'title',
      showOnSmall: true,
      render: (discussion: Discussion) => `
        <div class="flex flex-col">
          <p class="font-semibold text-primary truncate">${discussion.title}</p>
          <p class="text-xs text-muted-foreground mt-1">${discussion.course ? discussion.course.name : '---'}</p>
        </div>
      `
    },
    {
      label: 'Auteur',
      mapToKey: 'author',
      showOnSmall: false,
      render: (discussion: Discussion) => `${discussion.author.firstName} ${discussion.author.lastName}`
    },
    {
      label: 'Réponses',
      mapToKey: 'messages',
      showOnSmall: false,
      render: (discussion: Discussion) => `${discussion.messages.length > 0 ? discussion.messages.length - 1 : 0}`
    },
    {
      label: 'Dernière activité',
      mapToKey: 'updatedAt',
      showOnSmall: true,
      render: (discussion: Discussion) => {
        const date = new Date(discussion.updatedAt);
        return `
          <div class="flex flex-col items-end">
            <p class="text-sm text-foreground">${date.toLocaleDateString('fr-FR')}</p>
            <p class="text-xs text-muted-foreground">${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        `;
      }
    }
  ];

  loadingState: LoadingState = {
    isLoading: false,
    hasError: false,
    allLoaded: true
  };

  messages: Messages = {
    onLoading: 'Chargement des discussions...',
    onAllLoaded: 'Toutes les discussions ont été chargées',
    onError: 'Erreur lors du chargement des discussions',
    onNoData: 'Aucune discussion pour le moment.'
  };

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
    this.loadingState = { isLoading: true, hasError: false, allLoaded: false };
    this.forumService.getAllDiscussions().subscribe({
      next: (discussions) => {
        this.discussions = discussions;
        this.isLoading = false;
        this.loadingState = { isLoading: false, hasError: false, allLoaded: true };
      },
      error: (err) => {
        this.error = `Erreur lors du chargement des discussions : ${err.message}`;
        this.isLoading = false;
        this.loadingState = { isLoading: false, hasError: true, allLoaded: false };
      }
    });
  }

  viewDiscussion(id: string): void {
    this.discussionSelected.emit(id);
  }

  onDiscussionSelect(discussion: Discussion): void {
    this.discussionSelected.emit(discussion._id);
  }

  getRowActions(discussion: Discussion): RowAction<Discussion>[] {
    if (!this.isAdmin()) {
      return [];
    }
    return [
      {
        label: 'Supprimer',
        onTriggered: (discussion: Discussion) => this.onDeleteDiscussion(discussion)
      }
    ];
  }

  getSelectedDiscussion(): Discussion | undefined {
    if (!this.selectedDiscussionId) {
      return undefined;
    }
    return this.discussions.find(d => d._id === this.selectedDiscussionId);
  }

  compareDiscussions(d1: Discussion, d2: Discussion): boolean {
    return d1._id === d2._id;
  }

  onDeleteDiscussion(discussion: Discussion): void {
    this.discussionToDelete = discussion;
    this.showDeleteDiscussionPopup = true;
  }

  confirmDeleteDiscussion(): void {
    if (this.discussionToDelete) {
      this.forumService.deleteDiscussion(this.discussionToDelete._id).subscribe({
        next: () => {
          this.loadDiscussions(); // Reload discussions after deletion
          if (this.selectedDiscussionId === this.discussionToDelete!._id) {
            this.discussionSelected.emit(null); // Close the discussion if it was open
          }
          this.cancelDeleteDiscussion();
        },
        error: (err) => {
          this.error = `Erreur lors de la suppression de la discussion : ${err.message}`;
          this.cancelDeleteDiscussion();
        }
      });
    }
  }

  cancelDeleteDiscussion(): void {
    this.showDeleteDiscussionPopup = false;
    this.discussionToDelete = null;
  }
}
