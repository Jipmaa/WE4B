import { AuthService } from '@/core/services/auth.service';
import {Component, inject, OnInit} from '@angular/core';
import { Router } from '@angular/router';
import {HeaderItem} from '@/shared/components/layout/header-item/header-item';
import {User} from '@/core/models/auth.models';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  imports: [
    HeaderItem,
    NgOptimizedImage
  ]
})
export class Header implements OnInit {

  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  protected readonly user: User | null = null;

  ngOnInit(): void {
    this.authService.user();
  }

  async logout() {
    this.authService.logout();
    await this.router.navigate(['/']);
  }

}
