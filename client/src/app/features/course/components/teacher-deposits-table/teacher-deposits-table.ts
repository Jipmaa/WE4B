import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import { TeacherDepositsResponse } from '@/core/models/deposited-files.models';
import { ApiResponse } from '@/core/models/_shared.models';
import { DepositedFilesService } from '@/core/services/deposited-files.service';

import { ButtonComponent } from '@/shared/components/ui/button/button';
import { GradingModalComponent } from '../grading-modal/grading-modal';
import {IconButtonComponent} from '@/shared/components/ui/icon-button/icon-button';

interface DepositRow {
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
  selector: 'app-teacher-deposits-table',
  imports: [
    CommonModule,
    LucideAngularModule,
    ButtonComponent,
    GradingModalComponent,
    IconButtonComponent
  ],
  templateUrl: './teacher-deposits-table.html'
})
export class TeacherDepositsTableComponent implements OnInit {
  @Input() activityId!: string;
  @Output() depositsUpdated = new EventEmitter<void>();

  private readonly depositedFilesService = inject(DepositedFilesService);

  deposits = signal<DepositRow[]>([]);
  activityInfo = signal<TeacherDepositsResponse['activity'] | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  isDownloadingAll = signal<boolean>(false);

  selectedDepositForGrading = signal<DepositRow | null>(null);
  showGradingModal = signal<boolean>(false);

  ngOnInit() {
    this.loadDeposits();
  }

  private loadDeposits() {
    this.isLoading.set(true);
    this.error.set(null);

    this.depositedFilesService.getTeacherView(this.activityId).subscribe({
      next: (response: ApiResponse<TeacherDepositsResponse>) => {
        if (response.success) {
          this.deposits.set(response.data.deposits.map(deposit => ({
            _id: deposit._id,
            student: deposit.student,
            createdAt: deposit.createdAt,
            isLate: deposit.isLate,
            evaluation: deposit.evaluation,
            fileCount: deposit.files.length,
            fileUrls: deposit.fileUrls
          })));
          this.activityInfo.set(response.data.activity);
        } else {
          this.error.set('Erreur lors du chargement des dépôts');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading deposits:', error);
        this.error.set('Erreur lors du chargement des dépôts');
        this.isLoading.set(false);
      }
    });
  }

  onDownloadAll() {
    this.isDownloadingAll.set(true);

    this.depositedFilesService.downloadAllDeposits(this.activityId).subscribe({
      next: (response) => {
        // Create download link
        const blob = new Blob([response], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.activityInfo()?.title || 'activity'}-All_Submissions.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.isDownloadingAll.set(false);
      },
      error: (error) => {
        console.error('Error downloading all deposits:', error);
        this.error.set('Erreur lors du téléchargement des dépôts');
        this.isDownloadingAll.set(false);
      }
    });
  }

  onDownloadDeposit(depositId: string, studentName: string) {
    this.depositedFilesService.downloadDeposit(this.activityId, depositId).subscribe({
      next: (response) => {
        // Create download link
        const blob = new Blob([response], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${studentName}-${this.activityInfo()?.title || 'activity'}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading deposit:', error);
        this.error.set('Erreur lors du téléchargement du dépôt');
      }
    });
  }

  onGradeDeposit(deposit: DepositRow) {
    this.selectedDepositForGrading.set(deposit);
    this.showGradingModal.set(true);
  }

  onGradingModalClose() {
    this.showGradingModal.set(false);
    this.selectedDepositForGrading.set(null);
  }

  onGradingSubmitted() {
    this.loadDeposits();
    this.depositsUpdated.emit();
    this.onGradingModalClose();
  }

  getStatusColor(deposit: DepositRow): string {
    if (deposit.evaluation?.grade !== undefined) {
      return 'text-green-600';
    }
    return deposit.isLate ? 'text-red-600' : 'text-blue-600';
  }

  getStatusText(deposit: DepositRow): string {
    if (deposit.evaluation?.grade !== undefined) {
      return `Noté: ${deposit.evaluation.grade}/20`;
    }
    return deposit.isLate ? 'En retard' : 'À évaluer';
  }

  getStatusIcon(deposit: DepositRow): string {
    if (deposit.evaluation?.grade !== undefined) {
      return 'circle-check';
    }
    return deposit.isLate ? 'triangle-alert' : 'clock';
  }

  formatGroups(groups: string[]): string {
    return groups.join(', ');
  }

  getGradedCount(): number {
    return this.deposits().filter(d => d.evaluation?.grade !== undefined).length;
  }

  getLateCount(): number {
    return this.deposits().filter(d => d.isLate).length;
  }
}
