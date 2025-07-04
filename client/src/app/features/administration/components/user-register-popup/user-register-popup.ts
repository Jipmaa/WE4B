import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, inject, CUSTOM_ELEMENTS_SCHEMA, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ValidationErrors, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { UsersService } from '@/core/services/users.service';
import { AuthService } from '@/core/services/auth.service';
import { CreateUserRequest, StudentDepartment, UserRole, User } from '@/core/models/user.models';
import { LucideAngularModule } from "lucide-angular";
import { ButtonComponent } from "@/shared/components/ui/button/button";
import { InputComponent } from "@/shared/components/ui/input/input";
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';

@Component({
  selector: 'app-user-register-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ButtonComponent, InputComponent, IconButtonComponent],
  templateUrl: './user-register-popup.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UserRegisterPopup implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() user: User | null = null;
  @Input() isEditMode = false;

  @Output() closePopup = new EventEmitter<void>();
  @Output() userSaved = new EventEmitter<User>();

  @ViewChild('firstFocusable') firstFocusable!: ElementRef<HTMLElement>;

  protected readonly authService = inject(AuthService);
  private readonly userService = inject(UsersService);

  private keydownListener?: (event: KeyboardEvent) => void;

  iconName: string = "eye-off";
  selectedFile: File | null = null;
  isSubmitting = false;
  submitError = '';

  myForm = new FormGroup({
    firstName: new FormControl<string>('', Validators.required),
    lastName: new FormControl<string>('', Validators.required),
    birthdate: new FormControl<string>('', Validators.required),
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    phone: new FormControl<string>('', [Validators.pattern(/^\+?\d{7,14}$/)]),
    roles: new FormControl<string[]>([], [rolesValidator]),
    department: new FormControl<string>(''),
    password: new FormControl<string>('', []),
    avatar: new FormControl<string>('')
  });

  ngOnInit(): void {
    this.keydownListener = this.onGlobalKeydown.bind(this);
    document.addEventListener('keydown', this.keydownListener);

    this.myForm.get('roles')?.valueChanges.subscribe(roles => {
      this.updateDepartmentValidation(roles || []);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue) {
      this.resetForm();
      this.updatePasswordValidation();
      if (this.isEditMode && this.user) {
        this.prefillForm();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
  }

  private updatePasswordValidation(): void {
    const passwordControl = this.myForm.get('password');

    if (this.isEditMode) {
      passwordControl?.setValidators([]);
    } else {
      passwordControl?.setValidators([Validators.required, passwordValidator]);
    }

    passwordControl?.updateValueAndValidity();
  }

  private prefillForm(): void {
    if (!this.user) return;

    const birthdate = this.user.birthdate ? new Date(this.user.birthdate).toISOString().split('T')[0] : '';

    this.myForm.patchValue({
      firstName: this.user.firstName || '',
      lastName: this.user.lastName || '',
      birthdate: birthdate,
      email: this.user.email || '',
      phone: this.user.phone || '',
      roles: this.user.roles || [],
      department: this.user.department || '',
      password: '',
      avatar: ''
    });
  }

  private updateDepartmentValidation(roles: string[]): void {
    const departmentControl = this.myForm.get('department');

    if (roles.includes('student')) {
      departmentControl?.setValidators([Validators.required]);
    } else {
      departmentControl?.clearValidators();
      departmentControl?.setValue('');
    }

    departmentControl?.updateValueAndValidity();
  }

  onClose(): void {
    this.closePopup.emit();
  }

  onGlobalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen) {
      this.onClose();
    }
  }

  onPopupKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onClose();
    }
  }

  onOverlayClick(): void {
    this.onClose();
  }

  onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onClose();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.submitError = 'Type de fichier non supporté. Veuillez choisir une image JPEG, PNG, GIF ou WebP.';
        event.target.value = '';
        this.selectedFile = null;
        this.myForm.get('avatar')?.setValue('');
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.submitError = 'Le fichier est trop volumineux. La taille maximale est de 5MB.';
        event.target.value = '';
        this.selectedFile = null;
        this.myForm.get('avatar')?.setValue('');
        return;
      }

      this.selectedFile = file;
      this.myForm.get('avatar')?.setValue(file.name);
      this.submitError = '';
    } else {
      this.selectedFile = null;
      this.myForm.get('avatar')?.setValue('');
    }
    this.myForm.get('avatar')?.updateValueAndValidity();
  }

  onRoleChange(event: any): void {
    const roles = this.myForm.value.roles as string[] || [];
    if (event.target.checked) {
      this.myForm.patchValue({ roles: [...roles, event.target.value] });
    } else {
      this.myForm.patchValue({ roles: roles.filter(r => r !== event.target.value) });
    }
    this.myForm.get('roles')?.markAsTouched();
  }

  onSubmit(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      this.submitError = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    const getRoles = (): UserRole[] => {
      return this.myForm.value.roles as UserRole[] || [];
    }

    const formData = {
      firstName: this.myForm.value.firstName || '',
      lastName: this.myForm.value.lastName || '',
      birthdate: this.myForm.value.birthdate || '',
      email: this.myForm.value.email || '',
      phone: this.myForm.value.phone || null,
      department: getRoles().includes('student') ? (this.myForm.value.department as StudentDepartment) || undefined : undefined,
      roles: getRoles()
    };

    const data: CreateUserRequest | any = {
      ...formData,
      ...((!this.isEditMode || this.myForm.value.password) && { password: this.myForm.value.password || '' })
    };

    if (this.isEditMode && this.user) {
      this.userService.updateUser(this.user._id!, data, this.selectedFile || undefined).subscribe({
        next: (updatedUser) => {
          this.isSubmitting = false;
          this.userSaved.emit(updatedUser.data.user);
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitError = err.error?.message || 'Erreur lors de la mise à jour de l\'utilisateur.';
          console.error(err);
        }
      });
    } else {
      this.userService.createUser(data as CreateUserRequest, this.selectedFile || undefined).subscribe({
        next: (newUser) => {
          this.isSubmitting = false;
          this.userSaved.emit(newUser.data.user);
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitError = err.error?.message || 'Erreur lors de la création de l\'utilisateur.';
          console.error(err);
        }
      });
    }
  }

  togglePassword(event: Event): void {
    event.preventDefault();
    const field = document.getElementById("inputPassword") as HTMLInputElement;
    if (field) {
      if (field.type === "password") {
        this.iconName = "eye";
        field.type = "text";
      } else {
        this.iconName = "eye-off";
        field.type = "password";
      }
    }
  }

  private resetForm(): void {
    this.myForm.reset({
      firstName: '',
      lastName: '',
      birthdate: '',
      email: '',
      phone: '',
      roles: [],
      department: '',
      password: '',
      avatar: ''
    });
    this.selectedFile = null;
    this.isSubmitting = false;
    this.submitError = '';
    this.iconName = "eye-off";
  }

  get formTitle(): string {
    return this.isEditMode ? 'Modifier l\'utilisateur' : 'Créer un utilisateur';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Mettre à jour' : 'Enregistrer';
  }
}

function passwordValidator(control: AbstractControl): ValidationErrors | null {
  const errors: any = {};
  const value = control.value || '';

  if (value.length < 10)
    errors["minLength"] = 'ok';
  if ((value.match(/[A-Z]/g) || []).length < 2)
    errors["uppercase"] = 'ok';
  if (!/\d/.test(control.value))
    errors["number"] = 'ok';
  if ((value.match(/[!@#$%^&*()_+\-=\[\]{} ':"\\|,.<>\/?]/g) || []).length < 2)
    errors["specialChars"] = 'ok';

  return Object.keys(errors).length ? errors : null;
}

function rolesValidator(control: AbstractControl): ValidationErrors | null {
  let value = control.value || [];

  if (typeof value === 'string') {
    value = [value];
  }
  value = value || [];

  const allowed = [
    ['student'],
    ['teacher'],
    ['admin'],
    ['teacher', 'admin'],
    ['admin', 'teacher']
  ];

  if (!Array.isArray(value) || value.length === 0) {
    return { rolesRequired: true };
  }

  const isAllowed = allowed.some(
    arr => arr.length === value.length && arr.every(role => value.includes(role))
  );

  if (!isAllowed) {
    return { rolesInvalid: true };
  }

  return null;
}
