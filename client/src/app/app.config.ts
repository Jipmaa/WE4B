import {
  ApplicationConfig,
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // HTTP Client with Auth Interceptor
    provideHttpClient(withInterceptors([authInterceptor])),

    importProvidersFrom(LucideAngularModule.pick(icons))
  ],
};
