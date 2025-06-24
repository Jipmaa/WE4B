import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ValidationErrors, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CourseUnitsService } from '@/core/services/course-units.service';
import { Router } from '@angular/router';
import { ButtonComponent } from "../../../../shared/components/ui/button/button";
import { InputComponent } from "../../../../shared/components/ui/input/input";

@Component({
  selector: 'app-register-courseunits',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: './register-courseunits.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegisterCourseunits implements OnInit {

  myForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    code: new FormControl<string>('', Validators.required),
    capacity: new FormControl(null, [Validators.required, capacityValidator]),
    type: new FormControl<string>('', Validators.required),
    image: new FormControl<string>('')
  });

  selectedFile: File | null = null;

  constructor(private http: HttpClient, private courseUnitService: CourseUnitsService, public router: Router) { }

  ngOnInit(): void {
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Type de fichier non supporté. Veuillez choisir une image JPEG, PNG, GIF ou WebP.');
        event.target.value = '';
        this.selectedFile = null;
        this.myForm.get('image')?.setValue(null);
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert('Le fichier est trop volumineux. La taille maximale est de 5MB.');
        event.target.value = '';
        this.selectedFile = null;
        this.myForm.get('image')?.setValue(null);
        return;
      }

      this.selectedFile = file; // pour l'envoi du fichier
      this.myForm.get('image')?.setValue(file); // pour le FormControl

      console.log('Selected file:', file); // Ajoutez ceci pour vérifier le fichier

    } else {
      this.selectedFile = null;
      this.myForm.get('image')?.setValue(null);
    }
    this.myForm.get('image')?.markAsTouched();
    this.myForm.get('image')?.markAsDirty();
    this.myForm.get('image')?.updateValueAndValidity();
  }

  onSubmit() {
    console.log(this.myForm.value, this.myForm.errors, this.myForm.status);

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      console.log(this.myForm.value, this.myForm.errors, this.myForm.status);
      alert('Formulaire invalide');
      return;
    }

    const data = {
      name: this.myForm.value.name || '',
      code: this.myForm.value.code || '',
      type: this.myForm.value.type || '',
      capacity: this.myForm.value.capacity || ''
    };

    console.log('Data to be sent:', data); // Ajoutez ceci pour vérifier les données

    // Envoie la requête POST via createUser du user.service.ts avec le fichier avatar
    this.courseUnitService.createCourseUnit(data as any, this.selectedFile || undefined).subscribe({//TODO remove any
      next: res => {
        alert('Ue créé avec succès !');
        this.myForm.reset();
        this.selectedFile = null;
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        /* gestion des erreurs */
        alert('Erreur lors de la création de l\'ue.');
        console.error(err);
      }
    });
  }

  onFileClick() {
    this.myForm.get('image')?.markAsTouched();
    this.myForm.get('image')?.markAsDirty();
  }
}

function capacityValidator(control: AbstractControl): ValidationErrors | null {

  const errors: any = {}
  const value = control.value || '';

  // Vérifie que la valeur est un nombre entier positif (et non vide)
  if (!/^\d+$/.test(control.value))
    errors["number"] = 'ok'

  return Object.keys(errors).length ? errors : null;
}
