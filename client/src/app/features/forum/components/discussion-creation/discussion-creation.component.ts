import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

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

  @Output() discussionCreated = new EventEmitter<string>();


  private readonly courseUnitsService = inject(CourseUnitsService);

  constructor(
    private fb: FormBuilder,
    private forumService: ForumService
  ) {
    this.discussionForm = this.fb.group({
      title: ['', Validators.required],
      message: ['', Validators.required],
      course: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.courseUnitsService.getCourseUnits().subscribe(response => {
      this.courses = response.data.courseUnits;
    });
  }

  async onSubmit(): Promise<void> {
    if (this.discussionForm.valid) {
      const currentUserId = this.user()?.['_id'];
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
            this.discussionCreated.emit(newDiscussion.data._id);
            this.discussionForm.reset();
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
