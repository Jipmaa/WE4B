import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent } from '@/shared/components/ui/button/button';
import { IconButtonComponent } from '@/shared/components/ui/icon-button/icon-button';
import { InputComponent } from '@/shared/components/ui/input/input';
import { TextareaComponent } from '@/shared/components/ui/textarea/textarea';
import { SelectComponent, SelectOption } from '@/shared/components/ui/select/select';
import { FileInputComponent } from '@/shared/components/ui/file-input/file-input';
import { CourseActivitiesService } from '@/core/services/course-activities.service';
import { CourseUnitsService } from '@/core/services/course-units.service';
import { CourseActivityType, FileType, CourseActivity } from '@/core/models/course-activity.models';

interface ActivityType {
  type: CourseActivityType;
  label: string;
  description: string;
  icon: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  description: string;
  activities: CourseActivity[]; // Array of course activities
}

interface NewCategoryData {
  name: string;
  description: string;
}

@Component({
  selector: 'app-add-activity-popup',
  templateUrl: './add-activity-popup.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
    IconButtonComponent,
    InputComponent,
    TextareaComponent,
    SelectComponent,
    FileInputComponent
  ]
})
export class AddActivityPopup implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() courseUnitId: string = '';
  @Input() set existingCategories(categories: CategoryOption[]) {
    this._existingCategories.set([...categories]);
  }
  get existingCategories(): CategoryOption[] {
    return this._existingCategories();
  }
  private _existingCategories = signal<CategoryOption[]>([]);

  @Output() closePopup = new EventEmitter<void>();
  @Output() activityCreated = new EventEmitter<void>();
  @Output() categoryCreated = new EventEmitter<CategoryOption>();

  @ViewChild('popup') popup!: ElementRef<HTMLElement>;
  @ViewChild('firstFocusable') firstFocusable!: ElementRef<HTMLElement>;
  @ViewChild('messageCategorySelect') messageCategorySelect?: SelectComponent;
  @ViewChild('fileCategorySelect') fileCategorySelect?: SelectComponent;
  @ViewChild('fileDepositoryCategorySelect') fileDepositoryCategorySelect?: SelectComponent;

  private readonly activityService = inject(CourseActivitiesService);
  private readonly courseUnitsService = inject(CourseUnitsService);

  currentStep = signal<'select-type' | 'fill-form'>('select-type');
  selectedActivityType = signal<CourseActivityType | null>(null);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  // Category selection signals
  showCategoryForm = signal(false);
  newCategoryData = signal<NewCategoryData>({ name: '', description: '' });
  
  // Method to check if create button should be disabled
  isCreateCategoryDisabled() {
    const nameControl = this.newCategoryForm.get('name');
    return !nameControl?.valid || !nameControl?.value?.trim() || this.isSubmitting();
  }
  
  // Convert existing categories to SelectOption format
  categoryOptions = computed((): SelectOption[] => {
    return this._existingCategories().map(cat => ({
      value: cat.name,
      label: cat.name,
      description: cat.description
    }));
  });

  private keydownListener?: (event: KeyboardEvent) => void;
  selectedFile: File | null = null;
  fileInputError: string | null = null;

  activityTypes: ActivityType[] = [
    {
      type: 'message',
      label: 'Message',
      description: 'Publier un message ou une annonce',
      icon: 'message-circle'
    },
    {
      type: 'file',
      label: 'Fichier',
      description: 'Partager un document ou fichier',
      icon: 'file'
    },
    {
      type: 'file-depository',
      label: 'Dépôt de fichiers',
      description: 'Permettre aux étudiants de déposer des fichiers',
      icon: 'upload'
    }
  ];

  // Forms for different activity types
  messageForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    content: new FormControl('', [Validators.required, Validators.maxLength(5000)]),
    level: new FormControl('normal', [Validators.required]),
    category: new FormControl('', [Validators.required, Validators.maxLength(50)])
  });

  fileForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    content: new FormControl('', [Validators.required, Validators.maxLength(5000)]),
    category: new FormControl('', [Validators.required, Validators.maxLength(50)])
  });

  fileDepositoryForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    content: new FormControl('', [Validators.required, Validators.maxLength(5000)]),
    instructionsText: new FormControl('', [Validators.maxLength(5000)]),
    maxFiles: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(20)]),
    restrictedFileTypes: new FormControl<FileType[]>([]),
    category: new FormControl('', [Validators.required, Validators.maxLength(50)])
  });

  // Form for new category creation
  newCategoryForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    description: new FormControl('', [Validators.maxLength(200)])
  });


  availableFileTypes: SelectOption[] = [
    { value: 'text-file', label: 'Fichiers texte' },
    { value: 'image', label: 'Images' },
    { value: 'presentation', label: 'Présentations' },
    { value: 'video', label: 'Vidéos' },
    { value: 'audio', label: 'Audio' },
    { value: 'spreadsheet', label: 'Tableurs' },
    { value: 'archive', label: 'Archives' }
  ];

  levelOptions: SelectOption[] = [
    { value: 'normal', label: 'Normal', description: 'Importance standard' },
    { value: 'important', label: 'Important', description: 'Nécessite une attention particulière' },
    { value: 'urgent', label: 'Urgent', description: 'Priorité maximale' }
  ];

  ngOnInit() {
    this.keydownListener = this.onGlobalKeydown.bind(this);
    document.addEventListener('keydown', this.keydownListener);
  }

  ngOnDestroy() {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
  }

  onClose() {
    this.resetPopup();
    this.closePopup.emit();
  }

  onGlobalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isOpen) {
      this.onClose();
    }
  }

  onOverlayClick() {
    this.onClose();
  }

  selectActivityType(type: CourseActivityType) {
    this.selectedActivityType.set(type);
    this.currentStep.set('fill-form');
    this.error.set(null);

    setTimeout(() => {
      this.firstFocusable?.nativeElement?.focus();
    }, 10);
  }

  goBackToSelection() {
    this.currentStep.set('select-type');
    this.selectedActivityType.set(null);
    this.resetForms();
    this.error.set(null);
  }

  onFileSelected(file: File | null) {
    this.selectedFile = file;
    this.fileInputError = null;
  }

  onFileValidationError(error: string) {
    this.fileInputError = error;
  }


  onSubmit() {
    const activityType = this.selectedActivityType();
    if (!activityType || !this.courseUnitId) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    if (activityType === 'message') {
      this.submitMessageActivity();
    } else if (activityType === 'file') {
      this.submitFileActivity();
    } else if (activityType === 'file-depository') {
      this.submitFileDepositoryActivity();
    }
  }

  private submitMessageActivity() {
    if (this.messageForm.invalid) {
      this.markFormGroupTouched(this.messageForm);
      this.isSubmitting.set(false);
      return;
    }

    const formValue = this.messageForm.value;
    const data = {
      title: formValue.title!,
      content: formValue.content!,
      level: formValue.level as 'normal' | 'important' | 'urgent',
      courseUnit: this.courseUnitId,
      category: formValue.category!
    };

    this.activityService.createMessageActivity(data).subscribe({
      next: () => {
        this.activityCreated.emit();
        this.onClose();
      },
      error: (error) => {
        this.error.set(error.message || 'Erreur lors de la création de l\'activité');
        this.isSubmitting.set(false);
      }
    });
  }

  private submitFileActivity() {
    if (this.fileForm.invalid || !this.selectedFile) {
      this.markFormGroupTouched(this.fileForm);
      if (!this.selectedFile) {
        this.fileInputError = 'Veuillez sélectionner un fichier';
      }
      this.isSubmitting.set(false);
      return;
    }

    const formValue = this.fileForm.value;
    
    // Determine file type based on file extension or MIME type
    let fileType: import('@/core/models/course-activity.models').FileType = 'other';
    const mimeType = this.selectedFile.type;
    const fileName = this.selectedFile.name.toLowerCase();

    if (mimeType.startsWith('image/')) {
      fileType = 'image';
    } else if (mimeType.startsWith('video/')) {
      fileType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      fileType = 'audio';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || fileName.includes('.ppt')) {
      fileType = 'presentation';
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || fileName.includes('.xls')) {
      fileType = 'spreadsheet';
    } else if (mimeType.startsWith('text/') || mimeType.includes('document') || fileName.includes('.doc') || fileName.includes('.txt')) {
      fileType = 'text-file';
    } else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive') || fileName.includes('.zip') || fileName.includes('.rar')) {
      fileType = 'archive';
    }

    const data = {
      title: formValue.title!,
      content: formValue.content!,
      courseUnit: this.courseUnitId,
      file: this.selectedFile,
      fileType: fileType,
      category: formValue.category!
    };

    this.activityService.createFileActivity(data).subscribe({
      next: () => {
        this.activityCreated.emit();
        this.onClose();
      },
      error: (error) => {
        this.error.set(error.message || 'Erreur lors de la création de l\'activité');
        this.isSubmitting.set(false);
      }
    });
  }

  private submitFileDepositoryActivity() {
    if (this.fileDepositoryForm.invalid) {
      this.markFormGroupTouched(this.fileDepositoryForm);
      this.isSubmitting.set(false);
      return;
    }

    const formValue = this.fileDepositoryForm.value;
    
    // Determine instructions: use file if provided, otherwise use instructionsText, fallback to content
    let instructionsText = formValue.instructionsText;
    if (!instructionsText || instructionsText.trim() === '') {
      instructionsText = formValue.content!;
    }

    const data = {
      title: formValue.title!,
      content: formValue.content!,
      courseUnit: this.courseUnitId,
      maxFiles: formValue.maxFiles!,
      restrictedFileTypes: formValue.restrictedFileTypes || [],
      instructions: this.selectedFile 
        ? { type: 'file' as const, file: '' } // The service will handle the file
        : { type: 'text' as const, text: instructionsText },
      category: formValue.category!
    };

    this.activityService.createFileDepositoryActivity(data, this.selectedFile || undefined).subscribe({
      next: () => {
        this.activityCreated.emit();
        this.onClose();
      },
      error: (error) => {
        this.error.set(error.message || 'Erreur lors de la création de l\'activité');
        this.isSubmitting.set(false);
      }
    });
  }

  private resetPopup() {
    this.currentStep.set('select-type');
    this.selectedActivityType.set(null);
    this.isSubmitting.set(false);
    this.error.set(null);
    this.selectedFile = null;
    this.fileInputError = null;
    this.showCategoryForm.set(false);
    this.newCategoryData.set({ name: '', description: '' });
    this.newCategoryForm.reset();
    this.resetForms();
  }

  private resetForms() {
    this.messageForm.reset({ level: 'normal' });
    this.fileForm.reset();
    this.fileDepositoryForm.reset({ maxFiles: 1, restrictedFileTypes: [], instructionsText: '' });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  // Category management methods
  onCategoryChange(value: string) {
    const form = this.getCurrentForm();
    if (form) {
      form.patchValue({ category: value });
    }
  }

  onCreateNewCategory() {
    this.showCategoryForm.set(true);
    this.newCategoryForm.reset();
    this.newCategoryData.set({ name: '', description: '' });
    
    // Close all category dropdowns
    this.messageCategorySelect?.closeDropdown();
    this.fileCategorySelect?.closeDropdown();
    this.fileDepositoryCategorySelect?.closeDropdown();
  }

  onSaveNewCategory() {
    if (this.newCategoryForm.valid && this.courseUnitId) {
      const formValue = this.newCategoryForm.value;
      const categoryData = {
        name: formValue.name!.trim(),
        description: formValue.description?.trim() || ''
      };
      
      this.isSubmitting.set(true);
      this.error.set(null);
      
      this.courseUnitsService.createCategory(this.courseUnitId, categoryData).subscribe({
        next: (response) => {
          if (response.success) {
            const newCategory: CategoryOption = {
              _id: response.data.category._id,
              name: response.data.category.name,
              description: response.data.category.description,
              activities: []
            };
            
            // Add to local categories list so it appears in the dropdown immediately
            const currentCategories = this._existingCategories();
            this._existingCategories.set([...currentCategories, newCategory]);
            
            // Emit the new category to parent component
            this.categoryCreated.emit(newCategory);
            
            // Select the new category
            this.onCategoryChange(newCategory.name);
            
            // Close the form
            this.showCategoryForm.set(false);
            this.newCategoryForm.reset();
            this.newCategoryData.set({ name: '', description: '' });
          }
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la création de la catégorie');
          this.isSubmitting.set(false);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.newCategoryForm);
    }
  }

  onCancelNewCategory() {
    this.showCategoryForm.set(false);
    this.newCategoryForm.reset();
    this.newCategoryData.set({ name: '', description: '' });
  }


  // Helper methods for template
  getSelectedActivityTypeInfo() {
    const type = this.selectedActivityType();
    return this.activityTypes.find(t => t.type === type);
  }

  getCurrentForm(): FormGroup | null {
    const type = this.selectedActivityType();
    switch (type) {
      case 'message': return this.messageForm;
      case 'file': return this.fileForm;
      case 'file-depository': return this.fileDepositoryForm;
      default: return null;
    }
  }

  getFieldError(fieldName: string): string | undefined {
    const form = this.getCurrentForm();
    if (!form) return undefined;

    const field = (form as any).get(fieldName);
    if (!field?.errors || !field.touched) return undefined;

    const errors = field.errors;

    if (errors['required']) return 'Ce champ est requis';
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} caractères`;
    if (errors['min']) return `Minimum ${errors['min'].min}`;
    if (errors['max']) return `Maximum ${errors['max'].max}`;

    return 'Valeur invalide';
  }

  hasFieldError(fieldName: string): boolean {
    const form = this.getCurrentForm();
    if (!form) return false;

    const field = (form as any).get(fieldName);
    return !!(field?.errors && field.touched);
  }

}
