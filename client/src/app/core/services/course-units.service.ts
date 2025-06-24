import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CapacityRangeResponse,
  CourseUnit,
  CourseUnitFilters,
  CourseUnitSearchResult, CourseUnitSortBy,
  CourseUnitsResponse,
  CourseUnitStats,
  CreateCourseUnitRequest,
  CreateCourseUnitsResponse,
  UpdateCourseUnitRequest
} from '../models/course-unit.models';
import { ApiResponse, SortOrder } from '../models/_shared.models';


@Injectable({
  providedIn: 'root'
})
export class CourseUnitsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/course-units`;

  // State management with signals
  private readonly _courseUnits = signal<CourseUnit[]>([]);
  private readonly _userCourseUnits = signal<CourseUnit[]>([]);
  private readonly _selectedCourseUnit = signal<CourseUnit | null>(null);
  private readonly _courseUnitStats = signal<CourseUnitStats | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isLoadingUserCourseUnits = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentFilters = signal<CourseUnitFilters>({});
  private readonly _pagination = signal<CourseUnitsResponse['pagination'] | null>(null);

  // Public readonly signals
  readonly courseUnits = this._courseUnits.asReadonly();
  readonly userCourseUnits = this._userCourseUnits.asReadonly();
  readonly selectedCourseUnit = this._selectedCourseUnit.asReadonly();
  readonly courseUnitStats = this._courseUnitStats.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isLoadingUserCourseUnits = this._isLoadingUserCourseUnits.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentFilters = this._currentFilters.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed signals
  readonly totalCourseUnits = computed(() => this._pagination()?.totalCourseUnits || 0);
  readonly hasCourseUnits = computed(() => this._courseUnits().length > 0);
  readonly hasUserCourseUnits = computed(() => this._userCourseUnits().length > 0);
  readonly totalCapacity = computed(() => this._courseUnits().reduce((sum, unit) => sum + unit.capacity, 0));
  readonly averageCapacity = computed(() => {
    const units = this._courseUnits();
    return units.length > 0 ? Math.round(this.totalCapacity() / units.length) : 0;
  });

  readonly courseUnitsByCapacity = computed(() => {
    const units = this._courseUnits();
    const ranges = {
      small: units.filter(unit => unit.capacity < 50),
      medium: units.filter(unit => unit.capacity >= 50 && unit.capacity < 200),
      large: units.filter(unit => unit.capacity >= 200)
    };
    return ranges;
  });

  readonly sortedCourseUnits = computed(() => {
    const units = [...this._courseUnits()];
    return units.sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly capacityDistribution = computed(() => {
    const units = this._courseUnits();
    const distribution = new Map<string, number>();

    units.forEach(unit => {
      const range = this.getCapacityRange(unit.capacity);
      distribution.set(range, (distribution.get(range) || 0) + 1);
    });

    return Array.from(distribution.entries()).map(([range, count]) => ({ range, count }));
  });

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

  getCourseUnitStats(): Observable<ApiResponse<CourseUnitStats>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<CourseUnitStats>>(`${this.baseUrl}/stats`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._courseUnitStats.set(response.data);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getUserCourseUnits(): Observable<ApiResponse<{ courseUnits: CourseUnit[] }>> {
    this._isLoadingUserCourseUnits.set(true);
    this._error.set(null);

    return this.http.get<ApiResponse<{ courseUnits: CourseUnit[] }>>(`${environment.apiUrl}/users/me/course-units`)
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
    formData.append('slug', "course");
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
          console.log('API Response:', response); // Ajoutez ceci pour voir la structure de la réponse
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

  searchCourseUnits(term: string, limit: number = 10): Observable<ApiResponse<CourseUnitSearchResult>> {
    this._isLoading.set(true);

    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());

    return this.http.get<ApiResponse<CourseUnitSearchResult>>(`${this.baseUrl}/search/${term}`, { params })
      .pipe(
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getCourseUnitByCode(code: string): Observable<ApiResponse<{ courseUnit: CourseUnit }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ courseUnit: CourseUnit }>>(`${this.baseUrl}/by-code/${code}`)
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

  getCourseUnitsByCapacityRange(
    minCapacity: number,
    maxCapacity: number,
    page: number = 1,
    limit: number = 10
  ): Observable<ApiResponse<CapacityRangeResponse>> {
    this._isLoading.set(true);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<CapacityRangeResponse>>(
      `${this.baseUrl}/capacity-range/${minCapacity}/${maxCapacity}`,
      { params }
    )
      .pipe(
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateCourseUnitImage(id: string, file: File): Observable<ApiResponse<{ courseUnit: CourseUnit }>> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    formData.append('image', file);

    return this.http.put<ApiResponse<{ courseUnit: CourseUnit }>>(`${this.baseUrl}/${id}/image`, formData)
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

  removeCourseUnitImage(id: string): Observable<ApiResponse<{ courseUnit: CourseUnit }>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<ApiResponse<{ courseUnit: CourseUnit }>>(`${this.baseUrl}/${id}/image`)
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

  // Utility Methods
  refreshCourseUnits(): void {
    const currentFilters = this._currentFilters();
    this.getCourseUnits(currentFilters).subscribe();
  }

  clearError(): void {
    this._error.set(null);
  }

  clearSelectedCourseUnit(): void {
    this._selectedCourseUnit.set(null);
  }

  clearCourseUnits(): void {
    this._courseUnits.set([]);
    this._pagination.set(null);
  }

  clearUserCourseUnits(): void {
    this._userCourseUnits.set([]);
  }

  refreshUserCourseUnits(): void {
    this.getUserCourseUnits().subscribe();
  }

  hasAccessToCourseUnit(courseUnitSlug: string): boolean {
    const userCourseUnits = this._userCourseUnits();
    return userCourseUnits.some(unit => unit.slug === courseUnitSlug);
  }

  getUserCourseUnitBySlug(slug: string): CourseUnit | null {
    const userCourseUnits = this._userCourseUnits();
    return userCourseUnits.find(unit => unit.slug === slug) || null;
  }

  // Helper methods
  generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  generateCodeFromName(name: string): string {
    const words = name.split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 6).toUpperCase();
    }

    // Take first letter of each word, up to 6 characters
    return words
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 6)
      .toUpperCase();
  }

  getCapacityRange(capacity: number): string {
    if (capacity < 20) return '0-19';
    if (capacity < 50) return '20-49';
    if (capacity < 100) return '50-99';
    if (capacity < 200) return '100-199';
    if (capacity < 500) return '200-499';
    if (capacity < 1000) return '500-999';
    return '1000+';
  }

  getCapacityLabel(capacity: number): string {
    if (capacity < 50) return 'Small';
    if (capacity < 200) return 'Medium';
    return 'Large';
  }

  getCapacityColor(capacity: number): string {
    if (capacity < 50) return 'text-blue-600';
    if (capacity < 200) return 'text-yellow-600';
    return 'text-red-600';
  }

  validateCourseUnitData(data: CreateCourseUnitRequest | UpdateCourseUnitRequest): string[] {
    const errors: string[] = [];

    if ('name' in data && data.name) {
      if (data.name.length > 50) {
        errors.push('Name must be less than 50 characters');
      }
    }

    if ('code' in data && data.code) {
      if (!/^[A-Z0-9]+$/.test(data.code)) {
        errors.push('Code must contain only uppercase letters and numbers');
      }
      if (data.code.length < 2 || data.code.length > 20) {
        errors.push('Code must be between 2 and 20 characters');
      }
    }

    if ('slug' in data && data.slug) {
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
      }
      if (data.slug.length < 2 || data.slug.length > 50) {
        errors.push('Slug must be between 2 and 50 characters');
      }
    }

    if ('capacity' in data && data.capacity !== undefined) {
      if (data.capacity < 1) {
        errors.push('Capacity must be a positive integer');
      }
    }

    if ('img' in data && data.img) {
      try {
        new URL(data.img);
      } catch {
        errors.push('Image path must be a valid URL');
      }
    }

    return errors;
  }

  isDuplicateSlug(slug: string, excludeId?: string): boolean {
    const units = this._courseUnits();
    return units.some(unit => unit.slug === slug && unit._id !== excludeId);
  }

  isDuplicateCode(code: string, excludeId?: string): boolean {
    const units = this._courseUnits();
    return units.some(unit => unit.code === code && unit._id !== excludeId);
  }

  // Filtering and sorting helpers
  filterCourseUnits(units: CourseUnit[], filters: CourseUnitFilters): CourseUnit[] {
    let filtered = [...units];

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(unit =>
        unit.name.toLowerCase().includes(searchTerm) ||
        unit.code.toLowerCase().includes(searchTerm) ||
        unit.slug.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.minCapacity !== undefined) {
      filtered = filtered.filter(unit => unit.capacity >= filters.minCapacity!);
    }

    if (filters.maxCapacity !== undefined) {
      filtered = filtered.filter(unit => unit.capacity <= filters.maxCapacity!);
    }

    return filtered;
  }

  sortCourseUnits(units: CourseUnit[], sortBy: CourseUnitSortBy, sortOrder: SortOrder): CourseUnit[] {
    const sorted = [...units];

    sorted.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      // Handle date fields
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle string fields
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
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
