import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@/shared/components/ui/button/button';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-delete-confirmation-popup',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconButtonComponent, LucideAngularModule],
  templateUrl: './delete-confirmation-popup.html',
})
export class DeleteConfirmationPopupComponent implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() message: string = 'Êtes vous sûr de vouloir supprimer cet élément?';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private keydownListener?: (event: KeyboardEvent) => void;

  ngOnInit(): void {
    this.keydownListener = this.onGlobalKeydown.bind(this);
    document.addEventListener('keydown', this.keydownListener);
  }

  ngOnDestroy(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onOverlayClick(): void {
    this.onCancel();
  }

  onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }

  onGlobalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen) {
      this.onCancel();
    }
  }
}
