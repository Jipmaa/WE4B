import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CourseActivity,
  CourseActivityFilters,
  CourseActivitiesResponse,
  CourseActivitySearchResult,
  CreateMessageActivityRequest,
  CreateFileActivityRequest,
  CreateFileDepositoryActivityRequest,
  UpdateMessageActivityRequest,
  UpdateFileActivityRequest,
  UpdateFileDepositoryActivityRequest
} from '../models/course-activity.models';
import { ApiResponse } from '../models/_shared.models';

import { CourseUnitsService } from './course-units.service';

@Injectable({
  providedIn: 'root'
})
export class CourseActivitiesService {
  private readonly http = inject(HttpClient);
  private readonly courseUnitsService = inject(CourseUnitsService);
  private readonly baseUrl = `${environment.apiUrl}/course-activities`;

  // State management with signals
  private readonly _activities = signal<CourseActivity[]>([]);
  private readonly _selectedActivity = signal<CourseActivity | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentFilters = signal<CourseActivityFilters>({});
  private readonly _pagination = signal<CourseActivitiesResponse['pagination'] | null>(null);

  // Public readonly signals
  readonly activities = this._activities.asReadonly();
  readonly selectedActivity = this._selectedActivity.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentFilters = this._currentFilters.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed signals
  readonly totalActivities = computed(() => this._pagination()?.totalActivities || 0);
  readonly hasActivities = computed(() => this._activities().length > 0);
  readonly messageActivities = computed(() => this._activities().filter(activity => activity.activityType === 'message'));
  readonly fileActivities = computed(() => this._activities().filter(activity => activity.activityType === 'file'));
  readonly fileDepositoryActivities = computed(() => this._activities().filter(activity => activity.activityType === 'file-depository'));

  readonly activitiesByType = computed(() => {
    const activities = this._activities();
    const types = {
      message: activities.filter(activity => activity.activityType === 'message'),
      file: activities.filter(activity => activity.activityType === 'file'),
      'file-depository': activities.filter(activity => activity.activityType === 'file-depository')
    };
    return types;
  });

  // Activity Methods
  getActivities(filters: CourseActivityFilters = {}): Observable<ApiResponse<CourseActivitiesResponse>> {
    this._isLoading.set(true);
    this._error.set(null);
    this._currentFilters.set(filters);

    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.activityType) params = params.set('activityType', filters.activityType);
    if (filters.courseUnit) params = params.set('courseUnit', filters.courseUnit);
    if (filters.createdBy) params = params.set('createdBy', filters.createdBy);
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);

    return this.http.get<ApiResponse<CourseActivitiesResponse>>(this.baseUrl, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this._activities.set(response.data.activities);
            this._pagination.set(response.data.pagination);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getActivityById(id: string): Observable<ApiResponse<{ activity: CourseActivity }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ activity: CourseActivity }>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._selectedActivity.set(response.data.activity);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  createMessageActivity(activityData: CreateMessageActivityRequest & { category?: string }): Observable<ApiResponse<{ activity: CourseActivity }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<{ activity: CourseActivity }>>(`${this.baseUrl}/message`, activityData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Add the new activity to the current list
            const currentActivities = this._activities();
            this._activities.set([response.data.activity, ...currentActivities]);
            this.courseUnitsService.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  createFileActivity(activityData: CreateFileActivityRequest & { category?: string }): Observable<ApiResponse<{ activity: CourseActivity }>> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    formData.append('title', activityData.title);
    formData.append('content', activityData.content);
    formData.append('courseUnit', activityData.courseUnit);

    if (activityData.category) {
      formData.append('category', activityData.category);
    }

    if (activityData.file) {
      // Determine file type based on file extension or MIME type
      let fileType = 'other';
      const mimeType = activityData.file.type;
      const fileName = activityData.file.name.toLowerCase();

      if (mimeType.startsWith('image/')) {
        fileType = 'image';
      } else if (mimeType.startsWith('video/')) {
        fileType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        fileType = 'audio';
      } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || fileName.includes('.ppt')) {
        fileType = 'presentation';
      } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || fileName.includes('.xls')) {
        fileType = 'spreadsheet';
      } else if (mimeType.startsWith('text/') || mimeType.includes('document') || fileName.includes('.doc') || fileName.includes('.txt')) {
        fileType = 'text-file';
      } else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive') || fileName.includes('.zip') || fileName.includes('.rar')) {
        fileType = 'archive';
      }

      formData.append('fileType', fileType);
      formData.append('file', activityData.file);
    }

    return this.http.post<ApiResponse<{ activity: CourseActivity }>>(`${this.baseUrl}/file`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Add the new activity to the current list
            const currentActivities = this._activities();
            this._activities.set([response.data.activity, ...currentActivities]);
            this.courseUnitsService.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  createFileDepositoryActivity(activityData: CreateFileDepositoryActivityRequest & { category?: string }, instructionsFile?: File): Observable<ApiResponse<{ activity: CourseActivity }>> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    formData.append('title', activityData.title);
    formData.append('content', activityData.content);
    formData.append('courseUnit', activityData.courseUnit);
    formData.append('maxFiles', activityData.maxFiles.toString());

    if (activityData.category) {
      formData.append('category', activityData.category);
    }

    if (activityData.restrictedFileTypes && activityData.restrictedFileTypes.length > 0) {
      formData.append('restrictedFileTypes', JSON.stringify(activityData.restrictedFileTypes));
    }

    if (activityData.dueAt) {
      formData.append('dueAt', activityData.dueAt.toISOString());
    }

    if (instructionsFile) {
      formData.append('instructions', JSON.stringify({ type: 'file' }));
      formData.append('file', instructionsFile);
    } else {
      formData.append('instructions', JSON.stringify({ type: 'text', text: activityData.content }));
    }

    return this.http.post<ApiResponse<{ activity: CourseActivity }>>(`${this.baseUrl}/file-depository`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Add the new activity to the current list
            const currentActivities = this._activities();
            this._activities.set([response.data.activity, ...currentActivities]);
            this.courseUnitsService.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateMessageActivity(id: string, activityData: UpdateMessageActivityRequest): Observable<ApiResponse<{ activity: CourseActivity }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<{ activity: CourseActivity }>>(`${this.baseUrl}/message/${id}`, activityData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the activity in the current list
            const currentActivities = this._activities();
            const updatedActivities = currentActivities.map(activity =>
              activity._id === id ? response.data.activity : activity
            );
            this._activities.set(updatedActivities);

            // Update selected activity if it's the same activity
            if (this._selectedActivity()?._id === id) {
              this._selectedActivity.set(response.data.activity);
            }
            this.courseUnitsService.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateFileActivity(id: string, activityData: UpdateFileActivityRequest): Observable<ApiResponse<{ activity: CourseActivity }>> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    if (activityData.title) formData.append('title', activityData.title);
    if (activityData.content) formData.append('content', activityData.content);
    if (activityData.category) formData.append('category', activityData.category);

    if (activityData.file) {
      // Determine file type based on file extension or MIME type
      let fileType = 'other';
      const mimeType = activityData.file.type;
      const fileName = activityData.file.name.toLowerCase();

      if (mimeType.startsWith('image/')) {
        fileType = 'image';
      } else if (mimeType.startsWith('video/')) {
        fileType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        fileType = 'audio';
      } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || fileName.includes('.ppt')) {
        fileType = 'presentation';
      } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || fileName.includes('.xls')) {
        fileType = 'spreadsheet';
      } else if (mimeType.startsWith('text/') || mimeType.includes('document') || fileName.includes('.doc') || fileName.includes('.txt')) {
        fileType = 'text-file';
      } else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive') || fileName.includes('.zip') || fileName.includes('.rar')) {
        fileType = 'archive';
      }

      formData.append('fileType', fileType);
      formData.append('file', activityData.file);
    } else if (activityData.fileType) {
      formData.append('fileType', activityData.fileType);
    }

    return this.http.put<ApiResponse<{ activity: CourseActivity }>>(`${this.baseUrl}/file/${id}`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the activity in the current list
            const currentActivities = this._activities();
            const updatedActivities = currentActivities.map(activity =>
              activity._id === id ? response.data.activity : activity
            );
            this._activities.set(updatedActivities);

            // Update selected activity if it's the same activity
            if (this._selectedActivity()?._id === id) {
              this._selectedActivity.set(response.data.activity);
            }
            this.courseUnitsService.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateFileDepositoryActivity(id: string, activityData: UpdateFileDepositoryActivityRequest, instructionsFile?: File): Observable<ApiResponse<{ activity: CourseActivity }>> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    if (activityData.title) formData.append('title', activityData.title);
    if (activityData.content) formData.append('content', activityData.content);
    if (activityData.maxFiles !== undefined) formData.append('maxFiles', activityData.maxFiles.toString());
    if (activityData.category) formData.append('category', activityData.category);

    if (activityData.restrictedFileTypes && activityData.restrictedFileTypes.length > 0) {
      formData.append('restrictedFileTypes', JSON.stringify(activityData.restrictedFileTypes));
    }

    if (activityData.dueAt !== undefined) {
      if (activityData.dueAt) {
        formData.append('dueAt', activityData.dueAt.toISOString());
      } else {
        formData.append('dueAt', '');
      }
    }

    if (instructionsFile) {
      formData.append('instructions', JSON.stringify({ type: 'file' }));
      formData.append('file', instructionsFile);
    } else if (activityData.instructions) {
      formData.append('instructions', JSON.stringify(activityData.instructions));
    }

    return this.http.put<ApiResponse<{ activity: CourseActivity }>>(`${this.baseUrl}/file-depository/${id}`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the activity in the current list
            const currentActivities = this._activities();
            const updatedActivities = currentActivities.map(activity =>
              activity._id === id ? response.data.activity : activity
            );
            this._activities.set(updatedActivities);

            // Update selected activity if it's the same activity
            if (this._selectedActivity()?._id === id) {
              this._selectedActivity.set(response.data.activity);
            }
            this.courseUnitsService.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  completeActivity(id: string): Observable<ApiResponse<{ activity: CourseActivity }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<{ activity: CourseActivity }>>(`${this.baseUrl}/${id}/complete`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the activity in the current list
            const currentActivities = this._activities();
            const updatedActivities = currentActivities.map(activity =>
              activity._id === id ? response.data.activity : activity
            );
            this._activities.set(updatedActivities);

            // Update selected activity if it's the same activity
            if (this._selectedActivity()?._id === id) {
              this._selectedActivity.set(response.data.activity);
            }
            this.courseUnitsService.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  deleteActivity(id: string): Observable<ApiResponse<{ deletedActivity: Partial<CourseActivity> }>> {
    this._isLoading.set(true);

    return this.http.delete<ApiResponse<{ deletedActivity: Partial<CourseActivity> }>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            // Remove the activity from the current list
            const currentActivities = this._activities();
            const updatedActivities = currentActivities.filter(activity => activity._id !== id);
            this._activities.set(updatedActivities);

            // Clear selected activity if it's the deleted activity
            if (this._selectedActivity()?._id === id) {
              this._selectedActivity.set(null);
            }
            this.courseUnitsService.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  searchActivities(term: string, limit: number = 10): Observable<ApiResponse<CourseActivitySearchResult>> {
    this._isLoading.set(true);

    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());

    return this.http.get<ApiResponse<CourseActivitySearchResult>>(`${this.baseUrl}/search/${term}`, { params })
      .pipe(
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  // Utility Methods
  refreshActivities(): void {
    const currentFilters = this._currentFilters();
    this.getActivities(currentFilters).subscribe();
  }

  clearError(): void {
    this._error.set(null);
  }

  clearSelectedActivity(): void {
    this._selectedActivity.set(null);
  }

  clearActivities(): void {
    this._activities.set([]);
    this._pagination.set(null);
  }

  // Helper methods
  getActivityTypeDisplay(type: string): string {
    switch (type) {
      case 'message': return 'Message';
      case 'file': return 'File';
      case 'file-depository': return 'File Depository';
      default: return type;
    }
  }

  getActivityTypeIcon(type: string): string {
    switch (type) {
      case 'message': return 'message';
      case 'file': return 'description';
      case 'file-depository': return 'cloud_upload';
      default: return 'help';
    }
  }

  getActivityTypeColor(type: string): string {
    switch (type) {
      case 'message': return 'text-blue-600';
      case 'file': return 'text-green-600';
      case 'file-depository': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  }

  canEditActivity(activity: CourseActivity, currentUserId: string): boolean {
    return activity.createdBy === currentUserId;
  }

  canDeleteActivity(activity: CourseActivity, currentUserId: string): boolean {
    return activity.createdBy === currentUserId;
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

  undoDeleteFile(fileUrl: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/undo-delete-file`, { fileUrl });
  }

  togglePin(id: string, newValue: boolean): Observable<ApiResponse<CourseActivity>> {
    return this.http.patch<ApiResponse<CourseActivity>>(`${this.baseUrl}/${id}`, { pin: newValue })
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the activity in the current list
            const currentActivities = this._activities();
            const updatedActivities = currentActivities.map(activity =>
              activity._id === id ? response.data : activity
            );
            this._activities.set(updatedActivities);

            // Update selected activity if it's the same activity
            if (this._selectedActivity()?._id === id) {
              this._selectedActivity.set(response.data);
            }

            // Request a refresh of course data
            this.courseUnitsService.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error))
      );
  }
}
