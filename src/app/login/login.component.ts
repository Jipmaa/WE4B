import { Component, OnInit } from '@angular/core';
import { LoginService } from '../services/login.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  error: string = '';

  constructor(private authService: LoginService, private router: Router) { }

  ngOnInit(): void {
  }

  onLogin() {
    this.authService.login(this.email, this.password).subscribe({
      next: (user) => {
        // Stocke l'utilisateur (localStorage ou service)
        localStorage.setItem('user', JSON.stringify(user));
        // Redirige vers la page des cours
        this.router.navigate(['/listecours']);
      },
      error: (err) => {
        this.error = err.error.message || 'Erreur de connexion';
      }
    });
  }

  TogglePass(icone: any) {
    var field = document.getElementById("exampleInputPassword1") as HTMLInputElement;
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