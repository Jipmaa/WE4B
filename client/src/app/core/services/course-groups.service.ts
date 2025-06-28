import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CourseGroup,
  CourseGroupWithMembers,
  CourseGroupFilters,
  CourseGroupsResponse,
  CourseGroupSearchResult,
  CourseGroupMembersResponse,
  CreateCourseGroupRequest,
  UpdateCourseGroupRequest,
  AddUserToCourseGroupRequest
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
  private readonly _groupMembers = signal<CourseGroupMembersResponse | null>(null);
  private readonly _myGroups = signal<CourseGroup[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentFilters = signal<CourseGroupFilters>({});
  private readonly _pagination = signal<CourseGroupsResponse['pagination'] | null>(null);

  // Public readonly signals
  readonly groups = this._groups.asReadonly();
  readonly selectedGroup = this._selectedGroup.asReadonly();
  readonly groupMembers = this._groupMembers.asReadonly();
  readonly myGroups = this._myGroups.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentFilters = this._currentFilters.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed signals
  readonly totalGroups = computed(() => this._pagination()?.totalGroups || 0);
  readonly hasGroups = computed(() => this._groups().length > 0);
  readonly groupsWithMembers = computed(() => this._groups().filter(group => group.members.length > 0));
  readonly groupsWithoutMembers = computed(() => this._groups().filter(group => group.members.length === 0));

  readonly groupsByCourseUnit = computed(() => {
    const groups = this._groups();
    const courseUnits = new Map<string, CourseGroup[]>();

    groups.forEach(group => {
      if (!courseUnits.has(group.courseUnit)) {
        courseUnits.set(group.courseUnit, []);
      }
      courseUnits.get(group.courseUnit)!.push(group);
    });

    return courseUnits;
  });

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

  getGroupById(id: string): Observable<ApiResponse<{ group: CourseGroup }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ group: CourseGroup }>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._selectedGroup.set(response.data.group);
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

  //createGroup(groupData: CreateCourseGroupRequest): Observable<ApiResponse<CreateCourseGroupResponse>> {
  /*createGroup(groupData: CreateCourseGroupRequest): Observable<ApiResponse<{ group: CourseGroup }>> {
    this._isLoading.set(true);
    this._error.set(null);

    // Create FormData to handle both course data and file upload
    const formData = new FormData();

    // Add course data to FormData
    formData.append('name', groupData.name);
    //formData.append('slug', "course");
    //formData.append('slug', slugify(courseUnitData.name, { lower: true, strict: true }));
    //formData.append('kind', groupData.kind);
    //formData.append('day', groupData.day);
    //formData.append('from', groupData.from.toString());

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
  }*/

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

  removeUserFromGroup(id: string, userId: string): Observable<ApiResponse<{ group: CourseGroup }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<ApiResponse<{ group: CourseGroup }>>(`${this.baseUrl}/${id}/users/${userId}`)
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

  getGroupMembers(id: string): Observable<ApiResponse<CourseGroupMembersResponse>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<CourseGroupMembersResponse>>(`${this.baseUrl}/${id}/users`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._groupMembers.set(response.data);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getGroupsByCourseUnit(courseUnitId: string): Observable<ApiResponse<{ groups: CourseGroup[] }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ groups: CourseGroup[] }>>(`${this.baseUrl}/by-course-unit/${courseUnitId}`)
      .pipe(
        tap(response => {
          if (response.success) {
            // You might want to merge these with existing groups or handle separately
            // For now, we'll just trigger a refresh of the current groups
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getMyGroups(): Observable<ApiResponse<{ groups: CourseGroup[] }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ groups: CourseGroup[] }>>(`${this.baseUrl}/my`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._myGroups.set(response.data.groups);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  searchGroups(term: string, limit: number = 10): Observable<ApiResponse<CourseGroupSearchResult>> {
    this._isLoading.set(true);

    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());

    return this.http.get<ApiResponse<CourseGroupSearchResult>>(`${this.baseUrl}/search/${term}`, { params })
      .pipe(
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  // Utility Methods
  refreshGroups(): void {
    const currentFilters = this._currentFilters();
    this.getGroups(currentFilters).subscribe();
  }

  clearError(): void {
    this._error.set(null);
  }

  clearSelectedGroup(): void {
    this._selectedGroup.set(null);
  }

  clearGroups(): void {
    this._groups.set([]);
    this._pagination.set(null);
  }

  clearGroupMembers(): void {
    this._groupMembers.set(null);
  }

  // Helper methods
  getGroupMemberCount(group: CourseGroup): number {
    return group.members.length;
  }

  isGroupFull(group: CourseGroup): boolean {
    if (!group.maxMembers) return false;
    return group.members.length >= group.maxMembers;
  }

  getGroupCapacityDisplay(group: CourseGroup): string {
    if (!group.maxMembers) {
      return `${group.members.length} members`;
    }
    return `${group.members.length}/${group.maxMembers} members`;
  }

  getGroupCapacityPercentage(group: CourseGroup): number {
    if (!group.maxMembers) return 0;
    return Math.round((group.members.length / group.maxMembers) * 100);
  }

  canAddMembers(group: CourseGroup): boolean {
    if (!group.maxMembers) return true;
    return group.members.length < group.maxMembers;
  }

  canEditGroup(group: CourseGroup, currentUserId: string): boolean {
    return group.createdBy === currentUserId;
  }

  canDeleteGroup(group: CourseGroup, currentUserId: string): boolean {
    return group.createdBy === currentUserId;
  }

  canManageMembers(group: CourseGroup, currentUserId: string): boolean {
    return group.createdBy === currentUserId;
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

    if ('description' in data && data.description) {
      if (data.description.length > 500) {
        errors.push('Description must be less than 500 characters');
      }
    }

    if ('maxMembers' in data && data.maxMembers !== undefined) {
      if (data.maxMembers < 1) {
        errors.push('Maximum members must be at least 1');
      }
      if (data.maxMembers > 1000) {
        errors.push('Maximum members cannot exceed 1000');
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
}
