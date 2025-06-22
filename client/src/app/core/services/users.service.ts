import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {User, UserFilters, UserRole, UserSearchResult, UsersResponse, UserStats} from '../models/user.models';
import {UpdateUserRequest} from '@/core/models/user.models';
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
  private readonly _userStats = signal<UserStats | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentFilters = signal<UserFilters>({});
  private readonly _pagination = signal<UsersResponse['pagination'] | null>(null);

  // Public readonly signals
  readonly users = this._users.asReadonly();
  readonly selectedUser = this._selectedUser.asReadonly();
  readonly userStats = this._userStats.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentFilters = this._currentFilters.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed signals
  readonly totalUsers = computed(() => this._pagination()?.totalUsers || 0);
  readonly hasUsers = computed(() => this._users().length > 0);
  readonly activeUsers = computed(() => this._users().filter(user => user.isActive));
  readonly inactiveUsers = computed(() => this._users().filter(user => !user.isActive));
  readonly adminUsers = computed(() => this._users().filter(user => user.roles.includes('admin')));
  readonly teacherUsers = computed(() => this._users().filter(user => user.roles.includes('teacher')));
  readonly studentUsers = computed(() => this._users().filter(user => user.roles.includes('student')));

  readonly usersByDepartment = computed(() => {
    const users = this._users();
    const departments = new Map<string, User[]>();

    users.forEach(user => {
      if (user.department) {
        if (!departments.has(user.department)) {
          departments.set(user.department, []);
        }
        departments.get(user.department)!.push(user);
      }
    });

    return departments;
  });

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

  getUserStats(): Observable<ApiResponse<UserStats>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<UserStats>>(`${this.baseUrl}/stats`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._userStats.set(response.data);
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

  toggleUserStatus(id: string): Observable<ApiResponse<{ user: User }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<{ user: User }>>(`${this.baseUrl}/${id}/toggle-status`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the user in the current list
            const currentUsers = this._users();
            const updatedUsers = currentUsers.map(user =>
              user._id === id ? response.data.user : user
            );
            this._users.set(updatedUsers);

            // Update selected user if it's the same user
            if (this._selectedUser()?._id === id) {
              this._selectedUser.set(response.data.user);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateUserRoles(id: string, roles: UserRole[]): Observable<ApiResponse<{ user: User }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<{ user: User }>>(`${this.baseUrl}/${id}/roles`, { roles })
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the user in the current list
            const currentUsers = this._users();
            const updatedUsers = currentUsers.map(user =>
              user._id === id ? response.data.user : user
            );
            this._users.set(updatedUsers);

            // Update selected user if it's the same user
            if (this._selectedUser()?._id === id) {
              this._selectedUser.set(response.data.user);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateUserProfile(id: string, profileData: UpdateUserRequest): Observable<ApiResponse<{ user: User }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<{ user: User }>>(`${this.baseUrl}/${id}/profile`, profileData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the user in the current list
            const currentUsers = this._users();
            const updatedUsers = currentUsers.map(user =>
              user._id === id ? response.data.user : user
            );
            this._users.set(updatedUsers);

            // Update selected user if it's the same user
            if (this._selectedUser()?._id === id) {
              this._selectedUser.set(response.data.user);
            }
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

  searchUsers(term: string, limit: number = 10): Observable<ApiResponse<UserSearchResult>> {
    this._isLoading.set(true);

    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());

    return this.http.get<ApiResponse<UserSearchResult>>(`${this.baseUrl}/search/${term}`, { params })
      .pipe(
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getUsersByRole(role: UserRole, page: number = 1, limit: number = 10): Observable<ApiResponse<UsersResponse>> {
    this._isLoading.set(true);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<UsersResponse>>(`${this.baseUrl}/by-role/${role}`, { params })
      .pipe(
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getUsersByDepartment(department: string, page: number = 1, limit: number = 10): Observable<ApiResponse<UsersResponse>> {
    this._isLoading.set(true);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<UsersResponse>>(`${this.baseUrl}/by-department/${department}`, { params })
      .pipe(
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  removeUserAvatar(id: string): Observable<ApiResponse<{ user: User }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<ApiResponse<{ user: User }>>(`${this.baseUrl}/${id}/avatar`)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the user in the current list
            const currentUsers = this._users();
            const updatedUsers = currentUsers.map(user =>
              user._id === id ? response.data.user : user
            );
            this._users.set(updatedUsers);

            // Update selected user if it's the same user
            if (this._selectedUser()?._id === id) {
              this._selectedUser.set(response.data.user);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  // Utility Methods
  refreshUsers(): void {
    const currentFilters = this._currentFilters();
    this.getUsers(currentFilters).subscribe();
  }

  clearError(): void {
    this._error.set(null);
  }

  clearSelectedUser(): void {
    this._selectedUser.set(null);
  }

  clearUsers(): void {
    this._users.set([]);
    this._pagination.set(null);
  }

  // Helper methods
  getUserInitials(user: User): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  }

  getUserRoleDisplay(roles: UserRole[]): string {
    const roleOrder: UserRole[] = ['admin', 'teacher', 'student'];
    const sortedRoles = roles.sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b));
    return sortedRoles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ');
  }

  canEditUser(user: User, currentUserRoles: UserRole[]): boolean {
    // Admins can edit anyone except themselves (handled by backend)
    if (currentUserRoles.includes('admin')) return true;

    // Teachers can edit students
    if (currentUserRoles.includes('teacher') && user.roles.includes('student')) return true;

    return false;
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
