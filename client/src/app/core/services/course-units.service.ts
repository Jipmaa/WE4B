import {computed, inject, Injectable, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {HttpClient, HttpErrorResponse, HttpParams} from '@angular/common/http';
import {catchError, Observable, switchMap, tap, throwError} from 'rxjs';
import {environment} from '../../../environments/environment';
import {
  CourseUnit,
  CourseUnitFilters,
  CourseUnitPopulated,
  CourseUnitsResponse,
  CreateCourseUnitRequest,
  CreateCourseUnitsResponse,
  UpdateCourseUnitRequest
} from '../models/course-unit.models';
import {ApiResponse} from '../models/_shared.models';
import slugify from 'slugify';

@Injectable({
  providedIn: 'root'
})
export class CourseUnitsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/course-units`;

  // State management with signals
  private readonly _courseUnits = signal<CourseUnit[]>([]);
  private readonly _userCourseUnits = signal<CourseUnit[]>([]);
  private readonly _selectedCourseUnit = signal<CourseUnit | CourseUnitPopulated | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isLoadingUserCourseUnits = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentFilters = signal<CourseUnitFilters>({});
  private readonly _pagination = signal<CourseUnitsResponse['pagination'] | null>(null);
  private readonly _refreshTrigger = signal(0);

  // Public readonly signals
  readonly userCourseUnits = this._userCourseUnits.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed signals
  readonly hasUserCourseUnits = computed(() => this._userCourseUnits().length > 0);

  // Course Units Methods
  getCourseUnits(filters: CourseUnitFilters = {}): Observable<ApiResponse<CourseUnitsResponse>> {
    this._isLoading.set(true);
    this._error.set(null);
    this._currentFilters.set(filters);

    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.minCapacity !== undefined) params = params.set('minCapacity', filters.minCapacity.toString());
    if (filters.maxCapacity !== undefined) params = params.set('maxCapacity', filters.maxCapacity.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);

    return this.http.get<ApiResponse<CourseUnitsResponse>>(this.baseUrl, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this._courseUnits.set(response.data.courseUnits);
            this._pagination.set(response.data.pagination);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getUserCourseUnits(): Observable<ApiResponse<{ courseUnits: CourseUnit[] }>> {
    this._isLoadingUserCourseUnits.set(true);
    this._error.set(null);

    return this.http.get<ApiResponse<{ courseUnits: CourseUnit[] }>>(`${this.baseUrl}/my-courses`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._userCourseUnits.set(response.data.courseUnits);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoadingUserCourseUnits.set(false))
      );
  }

  getCourseUnitById(id: string): Observable<ApiResponse<{ courseUnit: CourseUnit }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ courseUnit: CourseUnit }>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._selectedCourseUnit.set(response.data.courseUnit);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  createCourseUnit(courseUnitData: CreateCourseUnitRequest, imgFile?: File): Observable<ApiResponse<CreateCourseUnitsResponse>> {
    this._isLoading.set(true);
    this._error.set(null);

    // Create FormData to handle both course data and file upload
    const formData = new FormData();

    // Add course data to FormData
    formData.append('name', courseUnitData.name);
    //formData.append('slug', "course");
    formData.append('slug', slugify(courseUnitData.name, { lower: true, strict: true }));
    formData.append('code', courseUnitData.code);
    formData.append('type', courseUnitData.type);
    formData.append('capacity', courseUnitData.capacity.toString());

    // Add img file if provided
    if (imgFile) {
      formData.append('image', imgFile);
    }

    return this.http.post<ApiResponse<CreateCourseUnitsResponse>>(this.baseUrl, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Add the new course unit to the current list
            const currentUnits = this._courseUnits();
            const updateCourseUnit = [response.data.course, ...currentUnits];
            this._courseUnits.set(updateCourseUnit);

            // Update pagination to reflect the new course count
            const currentPagination = this._pagination();
            if (currentPagination) {
              const updatedPagination = {
                ...currentPagination,
                totalCourseUnits: currentPagination.totalCourseUnits + 1
              };
              this._pagination.set(updatedPagination);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateCourseUnit(id: string, courseUnitData: UpdateCourseUnitRequest): Observable<ApiResponse<{ courseUnit: CourseUnit }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<{ courseUnit: CourseUnit }>>(`${this.baseUrl}/${id}`, courseUnitData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the course unit in the current list
            const currentUnits = this._courseUnits();
            const updatedUnits = currentUnits.map(unit =>
              unit._id === id ? response.data.courseUnit : unit
            );
            this._courseUnits.set(updatedUnits);

            // Update selected course unit if it's the same unit
            if (this._selectedCourseUnit()?._id === id) {
              this._selectedCourseUnit.set(response.data.courseUnit);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  deleteCourseUnit(id: string): Observable<ApiResponse<{ deletedCourseUnit: Partial<CourseUnit> }>> {
    this._isLoading.set(true);

    return this.http.delete<ApiResponse<{ deletedCourseUnit: Partial<CourseUnit> }>>(`${this.baseUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            // Remove the course unit from the current list
            const currentUnits = this._courseUnits();
            const updatedUnits = currentUnits.filter(unit => unit._id !== id);
            this._courseUnits.set(updatedUnits);

            // Clear selected course unit if it's the deleted unit
            if (this._selectedCourseUnit()?._id === id) {
              this._selectedCourseUnit.set(null);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getCourseUnitBySlug(slug: string): Observable<ApiResponse<{ courseUnit: CourseUnit }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ courseUnit: CourseUnit }>>(`${this.baseUrl}/by-slug/${slug}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._selectedCourseUnit.set(response.data.courseUnit);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  createCategory(courseUnitId: string, categoryData: { name: string; description?: string }): Observable<ApiResponse<{ category: any }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<{ category: any }>>(`${this.baseUrl}/${courseUnitId}/categories`, categoryData)
      .pipe(
        tap(response => {
          if (response.success) {
            // Trigger a refresh of the course data to update the categories
            this.triggerCourseDataRefresh();
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  triggerCourseDataRefresh(): void {
    this._refreshTrigger.update(v => v + 1);
  }

  clearUserCourseUnits(): void {
    this._userCourseUnits.set([]);
  }

  hasAccessToCourseUnit(courseUnitSlug: string): boolean {
    const userCourseUnits = this._userCourseUnits();
    return userCourseUnits.some(unit => unit.slug === courseUnitSlug);
  }

  getUserCourseUnitBySlug(slug: string): Observable<ApiResponse<{ courseUnit: CourseUnitPopulated }>> {
    this._isLoading.set(true);

    return toObservable(this._refreshTrigger).pipe(
      switchMap(() => this.http.get<ApiResponse<{ courseUnit: CourseUnitPopulated }>>(`${this.baseUrl}/by-slug/${slug}`)),
      tap(response => {
        if (response.success) {
          this._selectedCourseUnit.set(response.data.courseUnit);
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
