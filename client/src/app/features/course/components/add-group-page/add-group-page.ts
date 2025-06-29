import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseGroupsService } from '@/core/services/course-groups.service';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@/shared/components/ui/button/button';
import { InputComponent } from '@/shared/components/ui/input/input';
import { CreateCourseGroupRequest, GroupKind, Day } from '@/core/models/course-group.models';

@Component({
  selector: 'app-add-group-page',
  templateUrl: './add-group-page.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent]
})
export class AddGroupPageComponent implements OnInit {

  courseUnitId!: string;

  myForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    slug: new FormControl<string>('', Validators.required),
    kind: new FormControl<GroupKind>('theoretical', Validators.required),
    day: new FormControl<Day>('monday', Validators.required),
    from: new FormControl<string>('', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]),
    to: new FormControl<string>('', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]),
    semester: new FormControl<1 | 2>(1, Validators.required)
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseGroupService: CourseGroupsService
  ) { }

  ngOnInit(): void {
    this.courseUnitId = this.route.snapshot.paramMap.get('courseUnitId')!;

    // Auto-generate slug from name
    this.myForm.get('name')?.valueChanges.subscribe(name => {
      if (name) {
        const slug = name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        this.myForm.get('slug')?.setValue(slug, { emitEvent: false });
      }
    });
  }

  onSubmit(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      alert('Formulaire invalide');
      return;
    }

    const formValues = this.myForm.value;
    const data: CreateCourseGroupRequest = {
      name: formValues.name!,
      slug: formValues.slug!,
      kind: formValues.kind as GroupKind,
      day: formValues.day as Day,
      from: formValues.from!,
      to: formValues.to!,
      semester: formValues.semester as 1 | 2,
      courseUnit: this.courseUnitId
    };

    // Validate data using service validation
    const validationErrors = this.courseGroupService.validateGroupData(data);
    if (validationErrors.length > 0) {
      alert('Validation errors: ' + validationErrors.join(', '));
      return;
    }

    this.courseGroupService.createGroup(data).subscribe({
      next: () => {
        alert('Groupe créé avec succès !');
        this.myForm.reset();
        this.router.navigate(['/dashboard']);//courses/slug
      },
      error: err => {
        /* gestion des erreurs */
        alert('Erreur lors de la création du groupe.');
        console.error(err);
      }
    });

  }
}
