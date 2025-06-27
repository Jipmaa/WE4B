import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ForumService } from '../../../../core/services/forum.service';
import { Discussion } from '../../../../core/models/discussion.models';

@Component({
  selector: 'app-discussion-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './discussion-list.component.html',
})
export class DiscussionListComponent implements OnInit {
  private readonly forumService = inject(ForumService);
  private readonly router = inject(Router);

  discussions: Discussion[] = [];
  error: string | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.loadDiscussions();
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
    this.router.navigate(['/forum/discussions', id]);
  }

  createNewDiscussion(): void {
    this.router.navigate(['/forum/new']);
  }
}
