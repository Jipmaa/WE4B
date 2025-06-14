import {
  ApplicationConfig, ErrorHandler,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import { routes } from './app.routes';

// Interceptors
import { authInterceptor } from '@/core/interceptors/auth.interceptor';

// Other dependencies
import {icons, LucideAngularModule} from 'lucide-angular';

export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('Global error caught:', error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // HTTP Client with Auth Interceptor
    provideHttpClient(withInterceptors([authInterceptor])),

    importProvidersFrom(LucideAngularModule.pick(icons))
  ],
};
