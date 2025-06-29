import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { FileDepositoryActivity } from '@/core/models/course-activity.models';
import { DepositedFilesWithDetails, MyDepositedFilesResponse } from '@/core/models/deposited-files.models';
import { DepositedFilesService } from '@/core/services/deposited-files.service';

import { ButtonComponent } from '@/shared/components/ui/button/button';
import { FileInputComponent } from '@/shared/components/ui/file-input/file-input.component';
import { getAcceptAttribute, getFileTypesDescription } from '@/shared/utils/file-type-mappings';

@Component({
  selector: 'app-student-deposit-interface',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ButtonComponent,
    FileInputComponent
  ],
  templateUrl: './student-deposit-interface.html'
})
export class StudentDepositInterfaceComponent implements OnInit {
  @Input() activity!: FileDepositoryActivity;
  @Output() depositUpdated = new EventEmitter<void>();

  private readonly depositedFilesService = inject(DepositedFilesService);

  currentDeposit = signal<DepositedFilesWithDetails | null>(null);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  uploadForm = new FormGroup({
    files: new FormControl<File[]>([], [Validators.required])
  });

  ngOnInit() {
    this.loadCurrentDeposit();
  }

  private loadCurrentDeposit() {
    this.isLoading.set(true);
    this.error.set(null);

    this.depositedFilesService.getMyDeposit(this.activity._id).subscribe({
      next: (response: MyDepositedFilesResponse) => {
        this.currentDeposit.set(response.deposit);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading deposit:', error);
        this.error.set('Erreur lors du chargement de votre dépôt');
        this.isLoading.set(false);
      }
    });
  }

  onFilesSelected(files: File[]) {
    this.uploadForm.patchValue({ files });
    this.error.set(null);
    this.success.set(null);
  }

  onFileValidationError(error: string) {
    this.error.set(error);
  }

  onSubmit() {
    if (this.uploadForm.invalid || this.isSubmitting()) return;

    const files = this.uploadForm.value.files!;
    const hasExistingDeposit = !!this.currentDeposit();

    this.isSubmitting.set(true);
    this.error.set(null);
    this.success.set(null);

    const request = hasExistingDeposit
      ? this.depositedFilesService.updateDeposit(this.activity._id, { files })
      : this.depositedFilesService.submitDeposit(this.activity._id, { files });

    request.subscribe({
      next: () => {
        const message = hasExistingDeposit
          ? 'Fichiers mis à jour avec succès'
          : 'Fichiers déposés avec succès';

        this.success.set(message);
        this.uploadForm.reset();
        this.loadCurrentDeposit();
        this.depositUpdated.emit();
        this.isSubmitting.set(false);
      },
      error: (error) => {
        console.error('Error submitting files:', error);
        this.error.set(error.message || 'Erreur lors du dépôt des fichiers');
        this.isSubmitting.set(false);
      }
    });
  }

  onDeleteDeposit() {
    if (!this.currentDeposit() || this.isSubmitting()) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer votre dépôt ?')) return;

    this.isSubmitting.set(true);
    this.error.set(null);
    this.success.set(null);

    this.depositedFilesService.deleteDeposit(this.activity._id).subscribe({
      next: () => {
        this.success.set('Dépôt supprimé avec succès');
        this.currentDeposit.set(null);
        this.depositUpdated.emit();
        this.isSubmitting.set(false);
      },
      error: (error) => {
        console.error('Error deleting deposit:', error);
        this.error.set(error.message || 'Erreur lors de la suppression du dépôt');
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

  isLateSubmission(): boolean {
    const deposit = this.currentDeposit();
    if (!deposit || !this.activity.dueAt) return false;

    return new Date(deposit.createdAt) > new Date(this.activity.dueAt);
  }

  hasGrade(): boolean {
    const deposit = this.currentDeposit();
    return !!(deposit?.evaluation?.grade !== undefined || deposit?.evaluation?.comment);
  }

  getAcceptAttribute(): string {
    if (!this.activity.restrictedFileTypes || this.activity.restrictedFileTypes.length === 0) {
      return '';
    }
    return getAcceptAttribute(this.activity.restrictedFileTypes);
  }

  getFileTypeDescriptionsText(): string {
    if (!this.activity.restrictedFileTypes || this.activity.restrictedFileTypes.length === 0) {
      return 'Tous types de fichiers acceptés';
    }
    return getFileTypesDescription(this.activity.restrictedFileTypes);
  }
}
