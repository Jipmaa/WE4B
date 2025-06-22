import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@/core/services/auth.service';
import { ChangePasswordRequest, ProfileUpdateRequest } from '@/core/models/auth.models';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent } from '@/shared/components/ui/button/button';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { InputComponent } from '@/shared/components/ui/input/input';
import { AuthImageComponent } from '../../ui/auth-image/auth-image.component';

@Component({
  selector: 'app-user-profile-popup',
  templateUrl: './user-profile-popup.html',
  imports: [
    ReactiveFormsModule,
    LucideAngularModule,
    ButtonComponent,
    IconButtonComponent,
    InputComponent,
    AuthImageComponent
  ]
})
export class UserProfilePopup implements OnInit, OnDestroy {
  @Input() isOpen = false;
  
  @Output() closePopup = new EventEmitter<void>();

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;
  @ViewChild('profilePopup') profilePopup!: ElementRef<HTMLElement>;
  @ViewChild('firstFocusable') firstFocusable!: ElementRef<HTMLElement>;

  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.user;
  private keydownListener?: (event: KeyboardEvent) => void;

  currentView: 'profile' | 'edit-info' | 'change-password' = 'profile';
  isUploading = false;
  uploadError = '';

  profileForm = new FormGroup({
    firstName: new FormControl('', [Validators.required, Validators.minLength(2)]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(2)])
  });

  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required])
  });

  ngOnInit() {
    this.keydownListener = this.onGlobalKeydown.bind(this);
    document.addEventListener('keydown', this.keydownListener);

    if (this.user()) {
      this.profileForm.patchValue({
        firstName: this.user()?.firstName || '',
        lastName: this.user()?.lastName || ''
      });
    }
  }

  ngOnDestroy() {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
  }

  onClose() {
    this.resetForms();
    this.currentView = 'profile';
    this.closePopup.emit();
  }

  onGlobalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isOpen) {
      this.onClose();
    }
  }

  onPopupKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onClose();
    }
  }

  onOverlayClick() {
    this.onClose();
  }

  onOverlayKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onClose();
    }
  }

  onAvatarClick() {
    this.avatarInput.nativeElement.click();
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.uploadAvatar(file);
    }
  }

  private uploadAvatar(file: File) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      this.uploadError = 'L\'image ne peut pas dépasser 5MB';
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      this.uploadError = 'Format d\'image non supporté. Utilisez JPEG, PNG, GIF ou WebP';
      return;
    }

    this.isUploading = true;
    this.uploadError = '';

    this.authService.updateAvatar(file).subscribe({
      next: () => {
        this.isUploading = false;
        this.avatarInput.nativeElement.value = '';
      },
      error: (error) => {
        this.isUploading = false;
        this.uploadError = error.message || 'Erreur lors de l\'upload de l\'avatar';
        this.avatarInput.nativeElement.value = '';
      }
    });
  }

  onRemoveAvatar() {
    if (confirm('Êtes-vous sûr de vouloir supprimer votre avatar ?')) {
      this.authService.removeAvatar().subscribe({
        next: () => {
          // Avatar removed successfully
        },
        error: (error) => {
          this.uploadError = error.message || 'Erreur lors de la suppression de l\'avatar';
        }
      });
    }
  }

  onEditInfo() {
    this.currentView = 'edit-info';
    setTimeout(() => {
      this.firstFocusable?.nativeElement?.focus();
    }, 10);
  }

  onChangePassword() {
    this.currentView = 'change-password';
    setTimeout(() => {
      this.firstFocusable?.nativeElement?.focus();
    }, 10);
  }

  onBackToProfile() {
    this.resetForms();
    this.currentView = 'profile';
    setTimeout(() => {
      this.firstFocusable?.nativeElement?.focus();
    }, 10);
  }

  onSaveProfile() {
    if (this.profileForm.valid) {
      const formValue = this.profileForm.value;
      const updateRequest: ProfileUpdateRequest = {
        firstName: formValue.firstName || undefined,
        lastName: formValue.lastName || undefined
      };

      this.authService.updateProfile(updateRequest).subscribe({
        next: () => {
          this.onBackToProfile();
        },
        error: (error) => {
          this.uploadError = error.message || 'Erreur lors de la mise à jour du profil';
        }
      });
    }
  }

  onSavePassword() {
    if (this.passwordForm.valid) {
      const formValue = this.passwordForm.value;

      if (formValue.newPassword !== formValue.confirmPassword) {
        this.uploadError = 'Les mots de passe ne correspondent pas';
        return;
      }

      const changePasswordRequest: ChangePasswordRequest = {
        currentPassword: formValue.currentPassword!,
        newPassword: formValue.newPassword!
      };

      this.authService.changePassword(changePasswordRequest).subscribe({
        next: () => {
          this.onBackToProfile();
        },
        error: (error) => {
          this.uploadError = error.message || 'Erreur lors du changement de mot de passe';
        }
      });
    }
  }

  async onLogout() {
    this.authService.logout().subscribe({
      next: async () => {
        this.onClose();
        await this.router.navigate(['/accounts/login']);
      }
    });
  }

  private resetForms() {
    this.profileForm.reset();
    this.passwordForm.reset();
    this.uploadError = '';

    if (this.user()) {
      this.profileForm.patchValue({
        firstName: this.user()?.firstName || '',
        lastName: this.user()?.lastName || ''
      });
    }
  }

  get profileFormErrors() {
    const errors: string[] = [];

    if (this.profileForm.get('firstName')?.invalid && this.profileForm.get('firstName')?.touched) {
      errors.push('Le prénom est requis (minimum 2 caractères)');
    }

    if (this.profileForm.get('lastName')?.invalid && this.profileForm.get('lastName')?.touched) {
      errors.push('Le nom est requis (minimum 2 caractères)');
    }

    return errors;
  }

  get passwordFormErrors() {
    const errors: string[] = [];

    if (this.passwordForm.get('currentPassword')?.invalid && this.passwordForm.get('currentPassword')?.touched) {
      errors.push('Le mot de passe actuel est requis');
    }

    if (this.passwordForm.get('newPassword')?.invalid && this.passwordForm.get('newPassword')?.touched) {
      errors.push('Le nouveau mot de passe est requis (minimum 6 caractères)');
    }

    if (this.passwordForm.get('confirmPassword')?.invalid && this.passwordForm.get('confirmPassword')?.touched) {
      errors.push('La confirmation du mot de passe est requise');
    }

    return errors;
  }
}
