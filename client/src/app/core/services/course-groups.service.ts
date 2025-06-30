import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CourseGroup,
  CourseGroupFilters,
  CourseGroupsResponse,
  CreateCourseGroupRequest,
  UpdateCourseGroupRequest,
  AddUserToCourseGroupRequest, CourseGroupsByCourseUnitResponse
} from '../models/course-group.models';
import { ApiResponse } from '../models/_shared.models';

@Injectable({
  providedIn: 'root'
})
export class CourseGroupsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/course-groups`;

  // State management with signals
  private readonly _groups = signal<CourseGroup[]>([]);
  private readonly _selectedGroup = signal<CourseGroup | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentFilters = signal<CourseGroupFilters>({});
  private readonly _pagination = signal<CourseGroupsResponse['pagination'] | null>(null);

  // Public readonly signals
  readonly groups = this._groups.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Group Methods
  getGroups(filters: CourseGroupFilters = {}): Observable<ApiResponse<CourseGroupsResponse>> {
    this._isLoading.set(true);
    this._error.set(null);
    this._currentFilters.set(filters);

    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.courseUnit) params = params.set('courseUnit', filters.courseUnit);
    if (filters.createdBy) params = params.set('createdBy', filters.createdBy);
    if (filters.hasMembers !== undefined) params = params.set('hasMembers', filters.hasMembers.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);

    return this.http.get<ApiResponse<CourseGroupsResponse>>(this.baseUrl, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this._groups.set(response.data.groups);
            this._pagination.set(response.data.pagination);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  createGroup(groupData: CreateCourseGroupRequest): Observable<ApiResponse<{ group: CourseGroup }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<{ group: CourseGroup }>>(this.baseUrl, groupData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Add the new group to the current list
            const currentGroups = this._groups();
            this._groups.set([response.data.group, ...currentGroups]);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }


  updateGroup(id: string, groupData: UpdateCourseGroupRequest): Observable<ApiResponse<{ group: CourseGroup }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<{ group: CourseGroup }>>(`${this.baseUrl}/${id}`, groupData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the group in the current list
            const currentGroups = this._groups();
            const updatedGroups = currentGroups.map(group =>
              group._id === id ? response.data.group : group
            );
            this._groups.set(updatedGroups);

            // Update selected group if it's the same group
            if (this._selectedGroup()?._id === id) {
              this._selectedGroup.set(response.data.group);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  deleteGroup(id: string): Observable<ApiResponse<{ deletedGroup: Partial<CourseGroup> }>> {
    this._isLoading.set(true);

    return this.http.delete<ApiResponse<{ deletedGroup: Partial<CourseGroup> }>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            // Remove the group from the current list
            const currentGroups = this._groups();
            const updatedGroups = currentGroups.filter(group => group._id !== id);
            this._groups.set(updatedGroups);

            // Clear selected group if it's the deleted group
            if (this._selectedGroup()?._id === id) {
              this._selectedGroup.set(null);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  addUserToGroup(id: string, userData: AddUserToCourseGroupRequest): Observable<ApiResponse<{ group: CourseGroup }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<{ group: CourseGroup }>>(`${this.baseUrl}/${id}/users`, userData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the group in the current list
            const currentGroups = this._groups();
            const updatedGroups = currentGroups.map(group =>
              group._id === id ? response.data.group : group
            );
            this._groups.set(updatedGroups);

            // Update selected group if it's the same group
            if (this._selectedGroup()?._id === id) {
              this._selectedGroup.set(response.data.group);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  validateGroupData(data: CreateCourseGroupRequest | UpdateCourseGroupRequest): string[] {
    const errors: string[] = [];

    if ('name' in data && data.name) {
      if (data.name.length < 3) {
        errors.push('Group name must be at least 3 characters long');
      }
      if (data.name.length > 100) {
        errors.push('Group name must be less than 100 characters');
      }
    }

    if ('slug' in data && data.slug) {
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
      }
    }

    if ('from' in data && data.from) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.from)) {
        errors.push('Start time must be in HH:mm format');
      }
    }

    if ('to' in data && data.to) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.to)) {
        errors.push('End time must be in HH:mm format');
      }
    }

    if ('from' in data && 'to' in data && data.from && data.to) {
      const fromTime = new Date(`1970-01-01T${data.from}:00`);
      const toTime = new Date(`1970-01-01T${data.to}:00`);
      if (fromTime >= toTime) {
        errors.push('End time must be after start time');
      }
    }

    return errors;
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

  getGroupsByCourseUnitSlug(slug: string): Observable<ApiResponse<CourseGroupsByCourseUnitResponse>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<CourseGroupsByCourseUnitResponse>>(`${this.baseUrl}/by-course-unit-slug/${slug}`)
      .pipe(
        tap(response => {
          if (response.success) {
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }
}
