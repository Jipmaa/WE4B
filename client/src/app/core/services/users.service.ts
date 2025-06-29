import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateUserRequest, CreateUserResponse,
  User,
  UserFilters,
  UsersResponse,
} from '../models/user.models';
import { ApiResponse } from '../models/_shared.models';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  // State management with signals
  private readonly _users = signal<User[]>([]);
  private readonly _selectedUser = signal<User | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentFilters = signal<UserFilters>({});
  private readonly _pagination = signal<UsersResponse['pagination'] | null>(null);

  // Public readonly signals
  readonly users = this._users.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Users Methods
  getUsers(filters: UserFilters = {}): Observable<ApiResponse<UsersResponse>> {
    this._isLoading.set(true);
    this._error.set(null);
    this._currentFilters.set(filters);

    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.role) params = params.set('role', filters.role);
    if (filters.department) params = params.set('department', filters.department);
    if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);

    return this.http.get<ApiResponse<UsersResponse>>(this.baseUrl, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this._users.set(response.data.users);
            this._pagination.set(response.data.pagination);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getUserById(id: string): Observable<ApiResponse<{ user: User }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ user: User }>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._selectedUser.set(response.data.user);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  createUser(userData: CreateUserRequest, _avatarFile?: File): Observable<ApiResponse<CreateUserResponse>> {
    this._isLoading.set(true);
    this._error.set(null);

    // Create FormData to handle both user data and file upload
    const formData = new FormData();

    // Add user data to FormData
    formData.append('email', userData.email);
    formData.append('password', userData.password);
    formData.append('firstName', userData.firstName);
    formData.append('lastName', userData.lastName);
    formData.append('birthdate', userData.birthdate.toString());

    if (userData.roles && userData.roles.length > 0) {
      userData.roles.forEach((role, index) => {
        formData.append(`roles[${index}]`, role);
      });
    }

    // Add department only if provided (typically for students)
    if (userData.department && userData.department.trim() !== '') {
      formData.append('department', userData.department);
    }

    if (userData.isActive !== undefined) {
      formData.append('isActive', userData.isActive.toString());
    }

    if (userData.isEmailVerified !== undefined) {
      formData.append('isEmailVerified', userData.isEmailVerified.toString());
    }

    if (userData.phone !== undefined && userData.phone !== null) {
      formData.append('phone', userData.phone);
    }



    return this.http.post<ApiResponse<CreateUserResponse>>(this.baseUrl, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Add the new user to the current list
            const currentUsers = this._users();
            const updatedUsers = [response.data.user, ...currentUsers];
            this._users.set(updatedUsers);

            // Update pagination to reflect the new user count
            const currentPagination = this._pagination();
            if (currentPagination) {
              const updatedPagination = {
                ...currentPagination,
                totalUsers: currentPagination.totalUsers + 1
              };
              this._pagination.set(updatedPagination);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateUser(userId: string, userData: CreateUserRequest, avatarFile?: File): Observable<ApiResponse<CreateUserResponse>> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();

    // Add user data to FormData
    formData.append('email', userData.email);
    formData.append('password', userData.password);
    formData.append('firstName', userData.firstName);
    formData.append('lastName', userData.lastName);
    formData.append('birthdate', userData.birthdate.toString());

    if (userData.roles && userData.roles.length > 0) {
      userData.roles.forEach((role, index) => {
        formData.append(`roles[${index}]`, role);
      });
    }

    if (userData.department && userData.department.trim() !== '') {
      formData.append('department', userData.department);
    }

    if (userData.isActive !== undefined) {
      formData.append('isActive', userData.isActive.toString());
    }

    if (userData.isEmailVerified !== undefined) {
      formData.append('isEmailVerified', userData.isEmailVerified.toString());
    }

    if (userData.phone !== undefined && userData.phone !== null) {
      formData.append('phone', userData.phone);
    }

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    return this.http.put<ApiResponse<CreateUserResponse>>(`${this.baseUrl}/${userId}`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Replace the updated user in the list
            const currentUsers = this._users();
            const updatedUsers = currentUsers.map(user =>
              user._id === userId ? response.data.user : user
            );
            this._users.set(updatedUsers);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  deleteUser(id: string): Observable<ApiResponse<{ deletedUser: Partial<User> }>> {
    this._isLoading.set(true);

    return this.http.delete<ApiResponse<{ deletedUser: Partial<User> }>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            // Remove the user from the current list
            const currentUsers = this._users();
            const updatedUsers = currentUsers.filter(user => user._id !== id);
            this._users.set(updatedUsers);

            // Clear selected user if it's the deleted user
            if (this._selectedUser()?._id === id) {
              this._selectedUser.set(null);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
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

    this._error.set(errorMessage);
    return throwError(() => error);
  }
}
