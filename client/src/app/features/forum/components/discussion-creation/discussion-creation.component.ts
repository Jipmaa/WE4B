import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ForumService } from '@/core/services/forum.service';
import { CourseUnitsService } from '@/core/services/course-units.service';
import { CourseUnit } from '@/core/models/course-unit.models';
import { CommonModule } from '@angular/common';
import { AuthService } from '@/core/services/auth.service';

@Component({
  selector: 'app-discussion-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './discussion-creation.component.html',
})
export class DiscussionCreationComponent implements OnInit {
  discussionForm: FormGroup;
  courses: CourseUnit[] = [];
  private readonly AuthService = inject(AuthService);
  protected readonly user = this.AuthService.user;


  private readonly courseUnitsService = inject(CourseUnitsService);

  constructor(
    private fb: FormBuilder,
    private forumService: ForumService,
    private router: Router
  ) {
    this.discussionForm = this.fb.group({
      title: ['', Validators.required],
      message: ['', Validators.required],
      course: [null],
    });
  }

  ngOnInit(): void {
    this.courseUnitsService.getCourseUnits().subscribe(response => {
      this.courses = response.data.courseUnits;
    });
  }

  // onSubmit(): void {
  //   if (this.discussionForm.valid) {
  //     this.forumService.createDiscussion(this.discussionForm.value).subscribe({
  //       next: (newDiscussion) => {
  //         this.router.navigate(['/forum/discussions', newDiscussion.data._id]);
  //       },
  //       error: (err) => {
  //         console.error('Error creating discussion:', err);
  //       }
  //     });
  //   }
  // }

  async onSubmit(): Promise<void> {
    if (this.discussionForm.valid) {
      // Supposons que tu as un userService avec la méthode getCurrentUser()
      const currentUserId = this.user()?.['_id']; // Récupère l'ID de l'utilisateur actuel
      const formValue = {
        ...this.discussionForm.value,
        author: currentUserId,
        messages: [
          {
            author: currentUserId,
            message: this.discussionForm.value.message
          }
        ]
      };
      this.forumService.createDiscussion(formValue).subscribe({
        next: async (newDiscussion) => {
          try {
            await this.router.navigate(['/forum/discussions', newDiscussion.data._id]);
          } catch (err) {
            console.error('Erreur de navigation :', err);
          }
        },
        error: (err) => {
          console.error('Error creating discussion:', err);
        }
      });
    }
  }
}
