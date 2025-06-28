import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
  AbstractControl,
  ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseGroupsService } from '../../../../core/services/course-groups.service';
//import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {ButtonComponent} from '@/shared/components/ui/button/button';
import {InputComponent} from '@/shared/components/ui/input/input';



export interface CourseGroup {
  _id: string;
  slug: string;
  name: string;
  kind: 'theoretical' | 'practical' | 'laboratory';
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  from: string; //heure début
  to: string; //heure de fin
  semester: 1 | 2;
  courseUnit: string;
  //users: groupUsers;//??
  //createdAt: Date;
  //updatedAt: Date;
}

@Component({
  selector: 'app-add-group-page',
  templateUrl: './add-group-page.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent]
})
export class AddGroupPageComponent implements OnInit {

  group: Partial<CourseGroup> = {};
  courseUnitId!: string;

  myForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    kind: new FormControl<string>('', Validators.required),
    day: new FormControl(null, Validators.required),
    from: new FormControl<string>('', Validators.required),
    to: new FormControl<string>('', Validators.required),
    semester: new FormControl<number>(0,Validators.required)
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseGroupService: CourseGroupsService
  ) { }

  ngOnInit(): void {
    this.courseUnitId = this.route.snapshot.paramMap.get('courseUnitId')!;
    this.group.courseUnit = this.courseUnitId;
  }

  onSubmit(): void {
    console.log(this.myForm.value, this.myForm.errors, this.myForm.status);

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      console.log(this.myForm.value, this.myForm.errors, this.myForm.status);
      alert('Formulaire invalide');
      return;
    }

    const data = {
      name: this.myForm.value.name || '',
      kind: this.myForm.value.kind || '',
      day: this.myForm.value.day || '',
      from: this.myForm.value.from || '',
      to: this.myForm.value.to || '',
      semester: this.myForm.value.semester || 0
    };

    console.log('Data to be sent:', data);

    // Envoie la requête POST via createCourseUnit du course-unit.service.ts avec l'image
    this.courseGroupService.createGroup(data as any).subscribe({
      next: res => {
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

    /*this.courseGroupService.createGroup(this.group as CourseGroup).subscribe({
      next: () => {
        this.router.navigate(['/courses', this.courseUnitId]);
      },
      error: (err) => {
        console.error('Error creating group:', err);
      }
    });*/
  }
}
