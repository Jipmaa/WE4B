import {
  Component, computed,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import {AuthImageComponent} from '@/shared/components/ui/auth-image/auth-image.component';
import {ButtonComponent} from '@/shared/components/ui/button/button';
import {IconButtonComponent} from '@/shared/components/ui/icon-button/icon-button';
import {InputComponent} from '@/shared/components/ui/input/input';
import {TextareaComponent} from '@/shared/components/ui/textarea/textarea';
import {LucideAngularModule} from 'lucide-angular';
import {AuthService} from '@/core/services/auth.service';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {CourseGroup, CreateCourseGroupRequest, Day, GroupKind} from '@/core/models/course-group.models';
import {CourseGroupsService} from '@/core/services/course-groups.service';
import {CourseUnit} from '@/core/models/course-unit.models';
import {User} from '@/core/models/user.models';
import slugify from 'slugify';

@Component({
  selector: 'app-create-group-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, IconButtonComponent, InputComponent, TextareaComponent, LucideAngularModule],
  templateUrl: './create-group-popup.html'
})
export class CreateGroupPopupComponent implements OnInit, OnDestroy, OnChanges {

  @Input() courseUnit: CourseUnit | null = null;
  @Input() group: CourseGroup | null = null; // Pour le mode édition
  @Input() isEditMode = false; // true = édition, false = création
  isOpen = computed(
    ()=> this.courseUnit !== null
  );

  @Output() closePopup = new EventEmitter<void>();
  @Output() groupSaved = new EventEmitter<any>();

  @ViewChild('firstFocusable') firstFocusable!: ElementRef<HTMLElement>;

  protected readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly courseGroupService = inject(CourseGroupsService);
  private readonly router = inject(Router);

  private keydownListener?: (event: KeyboardEvent) => void;

  isSubmitting = false;
  submitError = '';

  myForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string | null>(null), // Added description field
    //slug: new FormControl<string>('', Validators.required),
    kind: new FormControl<GroupKind | null>(null, Validators.required),
    day: new FormControl<Day | null>(null, Validators.required),
    from: new FormControl<string>('', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]),
    to: new FormControl<string>('', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]),
    semester: new FormControl<1 | 2>(1, Validators.required)
    //courseUnit
  });

  constructor() {
  }

  ngOnInit(): void {
    this.keydownListener = this.onGlobalKeydown.bind(this);
    document.addEventListener('keydown', this.keydownListener);
  }

  ngOnDestroy(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['group'] || changes['isEditMode']) {
      if (this.isEditMode && this.group) {
        this.prefillForm();
      } else {
        this.resetForm();
      }
    }
  }

  private prefillForm(): void {
    if (!this.group) return;

    this.myForm.patchValue({
      name: this.group.name || '',
      description: this.group.description || '',
      kind: this.group.kind || '',
      day: this.group.day || '',
      from: this.group.from || '',
      to: this.group.to || '',
      semester: this.group.semester || ''
      //slug
      //courseunit
    });
  }

  onClose(): void {
    this.resetForm();
    this.closePopup.emit();
  }

  onGlobalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen()) {
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

  onSubmit(): void {
    if(!this.courseUnit){
      return;
    }

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      this.submitError = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    const data = {
      name: this.myForm.value.name || '',
      description: this.myForm.value.description || undefined, // Added description
      kind: this.myForm.value.kind! as GroupKind,
      day: this.myForm.value.day! as Day,
      from: this.myForm.value.from || '',
      to: this.myForm.value.to || '',
      semester: this.myForm.value.semester || undefined,
      courseUnit: this.courseUnit._id,
      slug: slugify(this.myForm.value.name || '', { lower: true, strict: true })
    };

    if (this.isEditMode && this.group) {
      // Mode édition - mise à jour
      this.courseGroupService.updateGroup(this.group._id!, data).subscribe({
        next: (updatedGroup) => {
          this.isSubmitting = false;
          this.groupSaved.emit(updatedGroup.data.group);
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitError = err.error?.message || 'Erreur lors de la mise à jour du groupe.';
          console.error(err);
        }
      });
    } else {
      // Mode création
      this.courseGroupService.createGroup(data as CreateCourseGroupRequest).subscribe({
        next: (newGroup) => {
          this.isSubmitting = false;
          this.groupSaved.emit(newGroup.data.group);
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitError = err.error?.message || 'Erreur lors de la création du groupe.';
          console.error(err);
        }
      });
    }
  }

  private resetForm(): void {
    this.myForm.reset();
    this.isSubmitting = false;
    this.submitError = '';
  }

  get formTitle(): string {
    return this.isEditMode ? 'Modifier le groupe' : 'Créer un groupe';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Mettre à jour' : 'Enregistrer';
  }

  protected readonly JSON = JSON;
}
