import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  inject,
  CUSTOM_ELEMENTS_SCHEMA,
  OnChanges, SimpleChanges
} from '@angular/core';
import {ButtonComponent} from '@/shared/components/ui/button/button';
import {IconButtonComponent} from '@/shared/components/ui/icon-button/icon-button';
import {InputComponent} from '@/shared/components/ui/input/input';
import {LucideAngularModule} from 'lucide-angular';
import {NgIf} from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ValidationErrors, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CourseUnitsService} from '@/core/services/course-units.service';
import { Router } from '@angular/router';
import { CreateUserRequest, StudentDepartment, UserRole, User } from '@/core/models/user.models';
import {CourseUnit, CreateCourseUnitRequest} from '@/core/models/course-unit.models';
import {UsersService} from '@/core/services/users.service';

@Component({
  selector: 'app-course-register-popup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    IconButtonComponent,
    InputComponent,
    LucideAngularModule,
    NgIf,
    ReactiveFormsModule,
  ],
  templateUrl: './course-register-popup.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CourseRegisterPopup implements OnInit, OnDestroy, OnChanges{

  @Input() isOpen = false;
  @Input() courseUnit: CourseUnit | null = null; // Pour le mode édition
  @Input() isEditMode = false; // true = édition, false = création

  @Output() closePopup = new EventEmitter<void>();
  @Output() courseUnitsSaved = new EventEmitter<CourseUnit>();

  @ViewChild('firstFocusable') firstFocusable!: ElementRef<HTMLElement>;

  private readonly http = inject(HttpClient);
  private readonly courseUnitsService = inject(CourseUnitsService);
  private readonly router = inject(Router);

  private keydownListener?: (event: KeyboardEvent) => void;

  selectedFile: File | null = null;
  isSubmitting = false;
  submitError = '';

  myForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    code: new FormControl<string>('', [Validators.required, codeValidator]),
    capacity: new FormControl(0, [Validators.required, capacityValidator]),
    type: new FormControl<string>('', Validators.required),
    image: new FormControl<string>('')
  });

  ngOnInit(): void {
    this.keydownListener = this.onGlobalKeydown.bind(this);
    document.addEventListener('keydown', this.keydownListener);

    // Pré-remplir le formulaire si en mode édition
    if (this.isEditMode && this.courseUnit) {
      this.prefillForm();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue) {
      this.resetForm();
      if (this.isEditMode && this.courseUnit) {
        this.prefillForm();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
  }

  private prefillForm(): void {
    if (!this.courseUnit) return;

    this.myForm.patchValue({
      name: this.courseUnit.name || '',
      code: this.courseUnit.code || '',
      capacity: this.courseUnit.capacity,
      type: this.courseUnit.type || '',
      image: this.courseUnit.img || ''
    });
  }

  onClose(): void {
    this.resetForm();
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
        this.myForm.get('image')?.setValue('');
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.submitError = 'Le fichier est trop volumineux. La taille maximale est de 5MB.';
        event.target.value = '';
        this.selectedFile = null;
        this.myForm.get('image')?.setValue('');
        return;
      }

      this.selectedFile = file;
      this.myForm.get('image')?.setValue(file.name);
      this.submitError = '';
    } else {
      this.selectedFile = null;
      this.myForm.get('image')?.setValue('');
    }
    this.myForm.get('image')?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      this.submitError = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    const capacityValue = this.myForm.value.capacity;
    const data = {
      name: this.myForm.value.name || '',
      code: this.myForm.value.code || '',
      capacity: capacityValue ? parseInt(String(capacityValue), 10) : 0,
      type: this.myForm.value.type as "CS" | "TM" | "EC" | "QC" | "OM",
    };

    if (this.isEditMode && this.courseUnit) {
      // Mode édition - mise à jour
      this.courseUnitsService.updateCourseUnit(this.courseUnit._id!, data).subscribe({
        next: (updatedCourseUnits) => {
          this.isSubmitting = false;
          this.courseUnitsSaved.emit(updatedCourseUnits.data.courseUnit);
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitError = err.error?.message || 'Erreur lors de la mise à jour de l\'utilisateur.';
          console.error(err);
        }
      });
    } else {
      // Mode création
      this.courseUnitsService.createCourseUnit(data as any, this.selectedFile || undefined).subscribe({
        next: (newCourseUnits) => {
          this.isSubmitting = false;
          this.courseUnitsSaved.emit(newCourseUnits.data.course);
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitError = err.error?.message || 'Erreur lors de la création de l\'ue.';
          console.error(err);
        }
      });
    }
  }

  private resetForm(): void {
    this.myForm.reset();
    this.selectedFile = null;
    this.isSubmitting = false;
    this.submitError = '';

    // Repré-remplir si en mode édition
    if (this.isEditMode && this.courseUnit) {
      setTimeout(() => this.prefillForm(), 0);
    }
  }

  get formTitle(): string {
    return this.isEditMode ? 'Modifier l\'UE' : 'Créer une UE';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Mettre à jour' : 'Enregistrer';
  }
}

function capacityValidator(control: AbstractControl): ValidationErrors | null {
  const errors: any = {};
  const value = control.value;

  if (value === null || value === undefined || value === '') {
    errors["required"] = true;
  } else {
    const numValue = Number(value);
    if (isNaN(numValue) || !Number.isInteger(numValue) || numValue <= 0) {
      errors["invalidCapacity"] = true;
    }
  }
  return Object.keys(errors).length ? errors : null;
}

function codeValidator(control: AbstractControl): ValidationErrors | null {

  const errors: any = {}  //dictionary to store all the errors
  const value = control.value || '';

  if (value.length < 2 || value.length > 20)
    errors["minLengthCode"] = 'ok'
  if (!/^[A-Z0-9]+$/.test(value))
    errors["codeValid"] = 'ok'

  return Object.keys(errors).length ? errors : null;
}
