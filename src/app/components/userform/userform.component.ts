import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ValidationErrors, Validators, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-userform',
  templateUrl: './userform.component.html',
  styleUrls: ['./userform.component.css']
})
export class UserformComponent implements OnInit {

  myForm = new FormGroup({
    firstName: new FormControl('', Validators.required),
    lastName: new FormControl('', Validators.required),
    birthdate: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    phoneNumber: new FormControl('', [Validators.required, phoneNumberValidator]),
    roles: new FormControl([], [rolesValidator]),
    password: new FormControl('', [Validators.required, passwordValidator]),
    avatar: new FormControl('', Validators.required)
  });

  selectedFile: File | null = null;

  constructor(private http: HttpClient, private userService: UserService, public router: Router) { }

  ngOnInit(): void {
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onRoleChange(event: any) {
    const roles = this.myForm.value.roles as string[];
    if (event.target.checked) {
      this.myForm.patchValue({ roles: [...roles, event.target.value] });
    } else {
      this.myForm.patchValue({ roles: roles.filter(r => r !== event.target.value) });
    }
    // Marque le champ comme touché pour déclencher l'affichage des erreurs
    this.myForm.get('roles')?.markAsTouched();
  }

  onSubmit() {
    const formData = new FormData();
    // Ajoute tous les champs du formulaire sauf le rôle
    Object.entries(this.myForm.value).forEach(([key, value]) => {
      if (key !== 'roles' && key !== 'avatar') {
        formData.append(key, value as string);
      }
    });
    // Ajoute les rôles (tableau)
    this.myForm.value.roles.forEach((role: string) => formData.append('roles[]', role));
    // Ajoute le fichier
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile);
    }
    // Envoie la requête POST via createUser du user.service.ts
    this.userService.createUser(formData).subscribe({
      next: res => {
        alert('Utilisateur créé avec succès !');
        this.myForm.reset();
        this.selectedFile = null;
        this.router.navigate(['/listecours']);//SANS DOUTE A CHANGER
      },
      error: err => {
        /* gestion des erreurs */
        alert('Erreur lors de la création de l\'utilisateur.');
        console.error(err);
      }
    });
  }

  TogglePass(icone: any) {
    var field = document.getElementById("inputPassword") as HTMLInputElement;
    if (field) {
      console.log("Champ de mot de passe trouvé :", field);
      if (field.type === "password") {
        icone.name = "eye-outline";
        field.type = "text";
      } else {
        icone.name = "eye-off-outline";
        field.type = "password";
      }
    }
  }
}

function passwordValidator(control: AbstractControl): ValidationErrors | null {

  const errors: any = {}  //dictionary to store all the errors

  if (control.value.length < 10)
    errors["minLength"] = 'ok'
  if ((control.value.match(/[A-Z]/g) || []).length < 2)
    errors["uppercase"] = 'ok'
  if (!/\d/.test(control.value))
    errors["number"] = 'ok'
  if ((control.value.match(/[!@#$%^&*()_+\-=\[\]{} ':"\\|,.<>\/?]/g) || []).length < 2)
    errors["specialChars"] = 'ok'

  return Object.keys(errors).length ? errors : null;
}

function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {

  const errors: any = {}
  const value = control.value || '';

  if (!/^\d{10}$/.test(value)) {
    errors["phoneFormat"] = 'ok';
  }

  return Object.keys(errors).length ? errors : null;
}

function rolesValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value || [];
  const allowed = [
    ['student'],
    ['teacher'],
    ['admin'],
    ['teacher', 'admin'],
    ['admin', 'teacher'] // pour l'ordre inverse
  ];

  // Vérifie qu'au moins un rôle est sélectionné
  if (!Array.isArray(value) || value.length === 0) {
    return { rolesRequired: true };
  }

  // Vérifie que la combinaison est autorisée
  const isAllowed = allowed.some(
    arr => arr.length === value.length && arr.every(role => value.includes(role))
  );
  if (!isAllowed) {
    return { rolesInvalid: true };
  }

  return null;
}
