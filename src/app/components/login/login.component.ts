import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../services/login.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: []
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  error: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;

  constructor(private authService: LoginService, private router: Router) { }

  ngOnInit(): void {
    // Clear any previous login state
    this.email = '';
    this.password = '';
    this.error = '';
  }

  onLogin(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    this.error = '';
    this.isLoading = true;

    // Basic validation
    if (!this.email || !this.password) {
      this.error = 'Veuillez remplir tous les champs';
      this.isLoading = false;
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.error = 'Veuillez entrer une adresse e-mail valide';
      this.isLoading = false;
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: (user) => {
        this.isLoading = false;
        // Stocke l'utilisateur (localStorage ou service)
        localStorage.setItem('user', JSON.stringify(user));
        // Redirige vers la page des cours
        this.router.navigate(['/listecours']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login error:', err);
        this.error = err.error?.message || 'Erreur de connexion. Veuillez vérifier vos identifiants.';
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // These methods can be used for debugging
  onEmailChange(value: string) {
    console.log('Email changed:', value);
    this.email = value;
  }

  onPasswordChange(value: string) {
    console.log('Password changed:', value);
    this.password = value;
  }

  // Clear error when user starts typing
  clearError() {
    if (this.error) {
      this.error = '';
    }
  }
}
