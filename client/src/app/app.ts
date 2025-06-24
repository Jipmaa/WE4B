import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@/core/services/auth.service';
import {Header} from '@/shared/components/layout/header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
})
export class App {
  readonly authService = inject(AuthService);

  readonly mainClasses = this.authService.isAuthenticated()
    ? 'bg-background w-full h-[calc(100dvh-3rem)]'
    : 'bg-background w-full min-h-dvh';
}
