import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import {Observable, catchError, throwError, retry, timer} from 'rxjs';
import { AuthService } from '@/core/services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get the accounts token
  const token = authService.token();

  // Skip adding token for accounts endpoints (login, register, etc.)
  const authEndpoints = ['/api/accounts/login', '/api/accounts/register'];
  const isAuthEndpoint = authEndpoints.some(endpoint => req.url.includes(endpoint));

  // Clone the request and add the authorization header if token exists
  let authReq = req;
  if (token && !isAuthEndpoint) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Handle the request and catch authentication errors
  return next(authReq).pipe(
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (error.status === 429) {
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          console.log(`⏰ Rate limited, retrying in ${delay}ms`);
          return timer(delay);
        }
        throw error; // Don't retry other errors
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        // Clear accounts data and redirect to login
        authService._clearLocalSession();
      }

      // Handle 403 Forbidden errors
      if (error.status === 403) {
        // User doesn't have permission, could redirect to unauthorized page
        router.navigate(['/unauthorized']);
      }

      if (error.status === 429) {
        console.warn('⏰ Rate limited - too many requests');
      }

      // Re-throw the error to be handled by the calling component
      return throwError(() => error);
    })
  );
};
