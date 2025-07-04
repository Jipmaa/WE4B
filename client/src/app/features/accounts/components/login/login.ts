import {Component, inject, OnInit} from '@angular/core';
import {AuthService} from '@/core/services/auth.service';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {ButtonComponent} from '@/shared/components/ui/button/button';
import {InputComponent} from '@/shared/components/ui/input/input';
import {LucideAngularModule} from 'lucide-angular';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    ButtonComponent,
    InputComponent,
    LucideAngularModule,
    NgOptimizedImage,
  ],
  templateUrl: './login.html',
})
export class Login implements OnInit {
  private readonly authService = inject(AuthService)
  private readonly router = inject(Router)

  email: string = '';
  password: string = '';
  error: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;

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

    this.authService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
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


  // Clear error when user starts typing
  clearError() {
    if (this.error) {
      this.error = '';
    }
  }
}
