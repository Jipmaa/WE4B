import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForumService } from '../../../../core/services/forum.service';
import { Discussion } from '../../../../core/models/discussion.models';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-discussion-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './discussion-view.component.html',
})
export class DiscussionViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly forumService = inject(ForumService);

  discussion: Discussion | null = null;
  newMessageContent = '';
  error: string | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (id) {
          this.isLoading = true;
          return this.forumService.getDiscussionById(id);
        }
        this.isLoading = false;
        this.error = "Aucun ID de discussion n'a été fourni.";
        return of(null);
      })
    ).subscribe({
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
    if (!this.newMessageContent.trim() || !this.discussion) {
      return;
    }

    this.forumService.addMessageToDiscussion(this.discussion._id, this.newMessageContent).subscribe({
      next: () => {
        // Recharge la discussion pour afficher le nouveau message.
        // Une approche plus optimisée pourrait être de recevoir le nouveau message de l'API
        // et de l'ajouter directement au tableau local.
        if (this.discussion) {
            this.forumService.getDiscussionById(this.discussion._id).subscribe(d => this.discussion = d);
        }
        this.newMessageContent = ''; // Vide le champ de saisie
      },
      error: (err) => {
        this.error = `Erreur lors de l'envoi du message : ${err.message}`;
      }
    });
  }
}
