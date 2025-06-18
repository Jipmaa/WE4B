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
    ? 'bg-background w-dvw min-[calc(100vh - 48px)]'
    : 'bg-background w-dvw min-h-dvh';
}
