import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
    firstName: new FormControl('', [
      Validators.required,
      Validators.maxLength(50)
    ]),
    lastName: new FormControl('', [
      Validators.required,
      Validators.maxLength(50)
    ]),
    department: new FormControl('', [
      Validators.maxLength(100)
    ]),
    birthdate: new FormControl('', [
      this.birthdateValidator
    ]),
    phone: new FormControl('', [
      this.phoneValidator
    ])
  });

  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required])
  }, { validators: this.passwordMatchValidator });

  ngOnInit() {
    this.keydownListener = this.onGlobalKeydown.bind(this);
    document.addEventListener('keydown', this.keydownListener);

    if (this.user()) {
      const user = this.user()!;
      const birthdate = user.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : '';

      this.profileForm.patchValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        department: user.department || '',
        birthdate: birthdate,
        phone: user.phone || ''
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
    this.markAllFieldsAsTouched();

    if (this.profileForm.valid) {
      const formValue = this.profileForm.value;
      const updateRequest: ProfileUpdateRequest = {
        firstName: formValue.firstName || undefined,
        lastName: formValue.lastName || undefined,
        department: formValue.department || undefined,
        birthdate: formValue.birthdate || undefined,
        phone: formValue.phone || undefined
      };

      this.authService.updateProfile(updateRequest).subscribe({
        next: () => {
          this.uploadError = '';
          this.onBackToProfile();
        },
        error: (error) => {
          this.uploadError = error.message || 'Erreur lors de la mise à jour du profil';
        }
      });
    } else {
      this.uploadError = 'Veuillez corriger les erreurs dans le formulaire';
    }
  }

  onSavePassword() {
    this.markAllPasswordFieldsAsTouched();

    if (this.passwordForm.valid) {
      const formValue = this.passwordForm.value;

      const changePasswordRequest: ChangePasswordRequest = {
        currentPassword: formValue.currentPassword!,
        newPassword: formValue.newPassword!
      };

      this.authService.changePassword(changePasswordRequest).subscribe({
        next: () => {
          this.uploadError = '';
          this.onBackToProfile();
        },
        error: (error) => {
          this.uploadError = error.message || 'Erreur lors du changement de mot de passe';
        }
      });
    } else {
      this.uploadError = 'Veuillez corriger les erreurs dans le formulaire';
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
      const user = this.user()!;
      const birthdate = user.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : '';

      this.profileForm.patchValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        department: user.department || '',
        birthdate: birthdate,
        phone: user.phone || ''
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

  // Custom validators
  private birthdateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Allow empty value since birthdate is optional
    }

    // Server uses isISO8601().toDate() - check if it's a valid ISO date format
    const dateStr = control.value;
    const date = new Date(dateStr);

    // Check if date is valid (matches server isISO8601 check)
    if (isNaN(date.getTime())) {
      return { invalidDate: { message: 'Please provide a valid birthdate' } };
    }

    // Basic check for reasonable date format (YYYY-MM-DD)
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoPattern.test(dateStr)) {
      return { invalidDate: { message: 'Please provide a valid birthdate' } };
    }

    return null;
  }

  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Allow empty value since phone is optional
    }

    // Match the server model regex pattern: /^\+?\d{7,14}$/
    const phoneValue = control.value.toString().trim();

    // Remove spaces and common formatting characters for validation
    const cleanPhone = phoneValue.replace(/[\s\-.()]/g, '');

    // Server model pattern: optional +, followed by 7-14 digits
    const phonePattern = /^\+?\d{7,14}$/;

    if (!phonePattern.test(cleanPhone)) {
      return { invalidPhone: { message: 'Please provide a valid phone number (7-14 digits, optional +)' } };
    }

    return null;
  }

  // Enhanced error getters for specific fields
  getFieldError(fieldName: string): string | null {
    const field = this.profileForm.get(fieldName);

    if (!field?.errors || !field.touched) {
      return null;
    }

    const errors = field.errors;

    if (errors['required']) {
      return `${this.getFieldLabel(fieldName)} est requis`;
    }

    if (errors['minlength']) {
      return `${this.getFieldLabel(fieldName)} doit contenir au moins ${errors['minlength'].requiredLength} caractères`;
    }

    if (errors['maxlength']) {
      return `${this.getFieldLabel(fieldName)} ne peut pas dépasser ${errors['maxlength'].requiredLength} caractères`;
    }

    if (errors['pattern']) {
      if (fieldName === 'firstName' || fieldName === 'lastName') {
        return `${this.getFieldLabel(fieldName)} ne peut contenir que des lettres, espaces, apostrophes et tirets`;
      }
    }

    if (errors['invalidDate']) {
      return errors['invalidDate'].message;
    }

    if (errors['futureDate']) {
      return errors['futureDate'].message;
    }

    if (errors['tooYoung']) {
      return errors['tooYoung'].message;
    }

    if (errors['tooOld']) {
      return errors['tooOld'].message;
    }

    if (errors['invalidPhone']) {
      return errors['invalidPhone'].message;
    }

    return 'Valeur invalide';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'Le prénom',
      lastName: 'Le nom',
      department: 'Le département',
      birthdate: 'La date de naissance',
      phone: 'Le numéro de téléphone'
    };
    return labels[fieldName] || 'Le champ';
  }

  // Method to check if a specific field has errors
  hasFieldError(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  // Method to trigger validation on form submit
  private markAllFieldsAsTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(key)?.markAsTouched();
    });
  }

  // Method to trigger validation on password form submit
  private markAllPasswordFieldsAsTouched(): void {
    Object.keys(this.passwordForm.controls).forEach(key => {
      this.passwordForm.get(key)?.markAsTouched();
    });
  }

  // Password match validator
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword) {
      return null;
    }

    if (newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: { message: 'Les mots de passe ne correspondent pas' } });
      return { passwordMismatch: { message: 'Les mots de passe ne correspondent pas' } };
    } else {
      // Clear the password mismatch error if passwords match
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
      }
    }

    return null;
  }

  // Enhanced error getters for password fields
  getPasswordFieldError(fieldName: string): string | null {
    const field = this.passwordForm.get(fieldName);

    if (!field?.errors || !field.touched) {
      return null;
    }

    const errors = field.errors;

    if (errors['required']) {
      return `${this.getPasswordFieldLabel(fieldName)} est requis`;
    }

    if (errors['minlength']) {
      return `${this.getPasswordFieldLabel(fieldName)} doit contenir au moins ${errors['minlength'].requiredLength} caractères`;
    }

    if (errors['passwordMismatch']) {
      return errors['passwordMismatch'].message;
    }

    return 'Valeur invalide';
  }

  private getPasswordFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      currentPassword: 'Le mot de passe actuel',
      newPassword: 'Le nouveau mot de passe',
      confirmPassword: 'La confirmation du mot de passe'
    };
    return labels[fieldName] || 'Le champ';
  }

  // Method to check if a specific password field has errors
  hasPasswordFieldError(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }
}
