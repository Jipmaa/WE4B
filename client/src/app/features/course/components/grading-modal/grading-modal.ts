import { Component, Input, Output, EventEmitter, OnInit, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { DepositedFilesService } from '@/core/services/deposited-files.service';
import { GradeDepositRequest } from '@/core/models/deposited-files.models';

import { ButtonComponent } from '@/shared/components/ui/button/button';
import { InputComponent } from '@/shared/components/ui/input/input';
import { TextareaComponent } from '@/shared/components/ui/textarea/textarea.component';

interface DepositForGrading {
  _id: string;
  student: {
    name: string;
    groups: string[];
  };
  createdAt: Date;
  isLate: boolean;
  evaluation?: {
    grade?: number;
    comment?: string;
    gradedAt?: Date;
  };
  fileCount: number;
  fileUrls?: string[];
}

@Component({
  selector: 'app-grading-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ButtonComponent,
    InputComponent,
    TextareaComponent
  ],
  templateUrl: './grading-modal.html'
})
export class GradingModalComponent implements OnInit {
  @Input() deposit!: DepositForGrading;
  @Input() activityId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() gradingSubmitted = new EventEmitter<void>();

  @ViewChild('modal') modal!: ElementRef<HTMLElement>;
  @ViewChild('firstFocusable') firstFocusable!: ElementRef<HTMLElement>;

  private readonly depositedFilesService = inject(DepositedFilesService);

  isSubmitting = signal<boolean>(false);
  error = signal<string | null>(null);

  gradingForm = new FormGroup({
    grade: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(20)
    ]),
    comment: new FormControl('', [Validators.maxLength(1000)])
  });

  private keydownListener?: (event: KeyboardEvent) => void;

  ngOnInit() {
    // Pre-populate form with existing evaluation if any
    if (this.deposit.evaluation) {
      this.gradingForm.patchValue({
        grade: this.deposit.evaluation.grade || null,
        comment: this.deposit.evaluation.comment || ''
      });
    }

    // Set up keyboard event listener
    this.keydownListener = this.onGlobalKeydown.bind(this);
    document.addEventListener('keydown', this.keydownListener);

    // Focus first input
    setTimeout(() => {
      this.firstFocusable?.nativeElement?.focus();
    }, 100);
  }

  ngOnDestroy() {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
  }

  onGlobalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.gradingForm.invalid || this.isSubmitting()) return;

    const formValue = this.gradingForm.value;
    const gradeData: GradeDepositRequest = {};

    if (formValue.grade !== null && formValue.grade !== undefined) {
      gradeData.grade = formValue.grade;
    }

    if (formValue.comment && formValue.comment.trim()) {
      gradeData.comment = formValue.comment.trim();
    }

    // Don't submit if no changes
    if (Object.keys(gradeData).length === 0) {
      this.onClose();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    this.depositedFilesService.gradeDeposit(this.activityId, this.deposit._id, gradeData).subscribe({
      next: () => {
        this.gradingSubmitted.emit();
      },
      error: (error) => {
        console.error('Error grading deposit:', error);
        this.error.set(error.message || 'Erreur lors de l\'enregistrement de la note');
        this.isSubmitting.set(false);
      }
    });
  }

  downloadFile(fileUrl: string, fileName: string) {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop();
      return fileName || 'fichier';
    } catch {
      return 'fichier';
    }
  }

  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'pdf': return 'file-text';
      case 'doc':
      case 'docx': return 'file-text';
      case 'xls':
      case 'xlsx': return 'file-spreadsheet';
      case 'ppt':
      case 'pptx': return 'presentation';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return 'image';
      case 'mp4':
      case 'webm': return 'video';
      case 'mp3':
      case 'wav': return 'music';
      case 'zip':
      case 'rar': return 'archive';
      default: return 'file';
    }
  }

  getFieldError(fieldName: string): string | undefined {
    const field = this.gradingForm.get(fieldName);
    if (!field?.errors || !field.touched) return undefined;

    const errors = field.errors;

    if (errors['min']) return `Minimum ${errors['min'].min}`;
    if (errors['max']) return `Maximum ${errors['max'].max}`;
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} caractères`;

    return 'Valeur invalide';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.gradingForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }
}