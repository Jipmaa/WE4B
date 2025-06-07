import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ValidationErrors, Validators, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UeService } from '../../services/ue.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ueform',
  templateUrl: './ueform.component.html',
  styleUrls: ['./ueform.component.css']
})
export class UeformComponent implements OnInit {

  myForm = new FormGroup({
    name: new FormControl('', Validators.required),
    code: new FormControl('', Validators.required),
    capacity: new FormControl(null, [Validators.required, capacityValidator]),
    type: new FormControl('', Validators.required),
    img_path: new FormControl('', Validators.required)
  });

  selectedFile: File | null = null;

  constructor(private http: HttpClient, private ueService: UeService, public router: Router) { }

  ngOnInit(): void {
  }

  onSubmit() {
    const formData = new FormData();
    console.log(this.myForm.value, this.myForm.errors, this.myForm.status);

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      console.log(this.myForm.value, this.myForm.errors, this.myForm.status);
      alert('Formulaire invalide');
      return;
    }

    // Ajoute tous les champs du formulaire sauf le rôle
    formData.append('name', this.myForm.value.name);
    formData.append('code', this.myForm.value.code);
    formData.append('capacity', this.myForm.value.capacity);
    formData.append('type', this.myForm.value.type);

    // Ajoute le fichier image
    if (this.selectedFile) {
      formData.append('img_path', this.selectedFile);
    }
    // Envoie la requête POST via createUser du user.service.ts
    this.ueService.createUe(formData).subscribe({
      next: res => {
        alert('Ue créé avec succès !');
        this.myForm.reset();
        this.selectedFile = null;
        this.router.navigate(['/listecours']);//SANS DOUTE A CHANGER
      },
      error: err => {
        /* gestion des erreurs */
        alert('Erreur lors de la création de l\'ue.');
        console.error(err);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file; // pour l'envoi du fichier
      this.myForm.get('img_path')?.setValue(file); // pour le FormControl     
    } else {
      // si on clique sur annuler, on remet la valeur à null
      this.myForm.get('img_path')?.setValue(null);
    }
    this.myForm.get('img_path')?.markAsTouched();
    this.myForm.get('img_path')?.markAsDirty();
    this.myForm.get('img_path')?.updateValueAndValidity();
  }

  onFileClick() {
    this.myForm.get('img_path')?.markAsTouched();
    this.myForm.get('img_path')?.markAsDirty();
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