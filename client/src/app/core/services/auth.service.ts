import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, tap, throwError, of } from 'rxjs';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ProfileUpdateRequest,
  ChangePasswordRequest,
  AuthState,
  JwtPayload,
  UserRole
} from '@/core/models/auth.models';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/_shared.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/accounts`;

  // Storage keys
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  // Signals for state management
  private readonly _user = signal<User | null>(this.getUserFromStorage());
  private readonly _token = signal<string | null>(this.getTokenFromStorage());
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => {
    const token = this._token();
    const user = this._user();
    return !!(token && user && this.isTokenValid(token));
  });

  readonly userRoles = computed(() => {
    const user = this._user();
    return user?.roles ?? [];
  });

  readonly isAdmin = computed(() => {
    return this.userRoles().includes('admin');
  });

  readonly isTeacher = computed(() => {
    return this.userRoles().includes('teacher') || this.isAdmin();
  });

  readonly isStudent = computed(() => {
    return this.userRoles().includes('student');
  });

  readonly authState = computed((): AuthState => ({
    user: this._user(),
    token: this._token(),
    isAuthenticated: this.isAuthenticated(),
    isLoading: this._isLoading(),
    error: this._error()
  }));

  getInitiales(): string {
    const user = this._user();
    if (user) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    return '';
  }

  constructor() {
    // Initialize from storage on service creation
    this.initializeFromStorage();
  }

  // Authentication Methods
  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success) {
            this.setAuthData(response.data.user, response.data.token);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  register(userData: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/register`, userData)
      .pipe(
        tap(response => {
          if (response.success) {
            this.setAuthData(response.data.user, response.data.token);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  logout(): Observable<ApiResponse<any>> {
    this._isLoading.set(true);

    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/logout`, {})
      .pipe(
        tap(() => {
          this.clearAuthData();
          this.router.navigate(['/auth/login']);
        }),
        catchError(error => {
          // Even if logout fails on server, clear local data
          this.clearAuthData();
          this.router.navigate(['/auth/login']);
          return of({ success: true, message: 'Logged out locally', data: null });
        }),
        tap(() => this._isLoading.set(false))
      );
  }

  // Profile Methods
  getCurrentUser(): Observable<ApiResponse<{ user: User }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ user: User }>>(`${this.baseUrl}/me`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._user.set(response.data.user);
            this.saveUserToStorage(response.data.user);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateProfile(profileData: ProfileUpdateRequest): Observable<ApiResponse<{ user: User }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<{ user: User }>>(`${this.baseUrl}/profile`, profileData)
      .pipe(
        tap(response => {
          if (response.success) {
            this._user.set(response.data.user);
            this.saveUserToStorage(response.data.user);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  changePassword(passwordData: ChangePasswordRequest): Observable<ApiResponse<any>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/change-password`, passwordData)
      .pipe(
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  deleteAccount(): Observable<ApiResponse<any>> {
    this._isLoading.set(true);

    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/delete-account`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.clearAuthData();
            this.router.navigate(['/']);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  // Role and Permission Methods
  hasRole(role: UserRole): boolean {
    return this.userRoles().includes(role);
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRoles = this.userRoles();
    return roles.some(role => userRoles.includes(role));
  }

  hasAllRoles(roles: UserRole[]): boolean {
    const userRoles = this.userRoles();
    return roles.every(role => userRoles.includes(role));
  }

  canAccess(requiredRoles: UserRole[]): boolean {
    if (!this.isAuthenticated()) return false;
    if (requiredRoles.length === 0) return true;
    return this.hasAnyRole(requiredRoles);
  }

  // Token Management
  private isTokenValid(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  private decodeToken(token: string): JwtPayload {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  // Storage Management
  private setAuthData(user: User, token: string): void {
    this._user.set(user);
    this._token.set(token);
    this.saveToStorage(user, token);
  }

  private clearAuthData(): void {
    this._user.set(null);
    this._token.set(null);
    this._error.set(null);
    this.clearStorage();
  }

  private saveToStorage(user: User, token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private saveUserToStorage(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private getTokenFromStorage(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  private initializeFromStorage(): void {
    const token = this.getTokenFromStorage();
    const user = this.getUserFromStorage();

    if (token && user && this.isTokenValid(token)) {
      this._user.set(user);
      this._token.set(token);
    } else {
      this.clearAuthData();
    }
  }

  // Error Handling
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error?.error?.message) {
      errorMessage = error.error.error.message;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Handle authentication errors
    if (error.status === 401) {
      this.clearAuthData();
      this.router.navigate(['/auth/login']);
    }

    this._error.set(errorMessage);
    return throwError(() => error);
  }

  // Utility Methods
  refreshUserData(): void {
    if (this.isAuthenticated()) {
      this.getCurrentUser().subscribe();
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
