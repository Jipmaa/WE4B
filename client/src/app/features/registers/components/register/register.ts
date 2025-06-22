import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ValidationErrors, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UsersService } from '@/core/services/users.service';
import { Router } from '@angular/router';
import {CreateUserRequest, UserRole} from '@/core/models/user.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Register implements OnInit {

  myForm = new FormGroup({
    firstName: new FormControl<string>('', Validators.required),
    lastName: new FormControl<string>('', Validators.required),
    birthdate: new FormControl<string>('', Validators.required),
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    phoneNumber: new FormControl<string>('', [Validators.required, phoneNumberValidator]),
    roles: new FormControl<string[]>([], [rolesValidator]),
    password: new FormControl<string>('', [Validators.required, passwordValidator]),
    avatar: new FormControl<string>('')
  });

  selectedFile: File | null = null;

  constructor(private http: HttpClient, private userService: UsersService, public router: Router) { }


  ngOnInit(): void {
    // Initialization logic can go here
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file; // pour l'envoi du fichier
      this.myForm.get('avatar')?.setValue(file); // pour le FormControl
    } else {
      this.myForm.get('avatar')?.setValue(null);
    }
    this.myForm.get('avatar')?.updateValueAndValidity();
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
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      alert('Formulaire invalide');
      return;
    }

    const getRoles = (): UserRole[] => {
      return this.myForm.value.roles as UserRole[] || [];
    }

    const data = {
      firstName: this.myForm.value.firstName || '',
      lastName: this.myForm.value.lastName || '',
      birthdate: this.myForm.value.birthdate || '',
      email: this.myForm.value.email || '',
      password: this.myForm.value.password || '',
      roles: getRoles(),
      avatar: this.myForm.value.avatar || undefined  // Will be replaced with minio url later on
    } satisfies CreateUserRequest;

    // Envoie la requête POST via createUser du user.service.ts
    this.userService.createUser(data).subscribe({
      next: res => {
        alert('Utilisateur créé avec succès !');
        this.myForm.reset();
        this.selectedFile = null;
        this.router.navigate(['/dashboard']);//SANS DOUTE A CHANGER
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
  const value = control.value || '';

  if (value.length < 10)
    errors["minLength"] = 'ok'
  if ((value.match(/[A-Z]/g) || []).length < 2)
    errors["uppercase"] = 'ok'
  if (!/\d/.test(control.value))
    errors["number"] = 'ok'
  if ((value.match(/[!@#$%^&*()_+\-=\[\]{} ':"\\|,.<>\/?]/g) || []).length < 2)
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
  //const value = control.value || [];
  let value = control.value || [];
  // Normalise en tableau si plusieurs rôles
  if (typeof value === 'string') {
    value = [value];
  }
  value = value || [];

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
