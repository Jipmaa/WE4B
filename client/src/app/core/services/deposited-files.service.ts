import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DepositedFilesWithDetails,
  DepositedFilesFilters,
  DepositedFilesResponse,
  MyDepositedFilesResponse,
  DepositStatsResponse,
  DeleteDepositResponse,
} from '../models/deposited-files.models';
import { ApiResponse } from '../models/_shared.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DepositedFilesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/course-activities`;

  // State management with signals
  private readonly _deposits = signal<DepositedFilesWithDetails[]>([]);
  private readonly _myDeposit = signal<DepositedFilesWithDetails | null>(null);
  private readonly _depositStats = signal<DepositStatsResponse | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentFilters = signal<DepositedFilesFilters>({});
  private readonly _currentActivityId = signal<string | null>(null);
  private readonly _pagination = signal<DepositedFilesResponse['pagination'] | null>(null);

  // Public readonly signals
  readonly deposits = this._deposits.asReadonly();
  readonly myDeposit = this._myDeposit.asReadonly();
  readonly depositStats = this._depositStats.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentFilters = this._currentFilters.asReadonly();
  readonly currentActivityId = this._currentActivityId.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed signals
  readonly totalDeposits = computed(() => this._pagination()?.totalDeposits || 0);
  readonly hasDeposits = computed(() => this._deposits().length > 0);
  readonly hasMyDeposit = computed(() => this._myDeposit() !== null);

  readonly depositsByUser = computed(() => {
    const deposits = this._deposits();
    const users = new Map<string, DepositedFilesWithDetails[]>();

    deposits.forEach(deposit => {
      const userId = deposit.user._id;
      if (!users.has(userId)) {
        users.set(userId, []);
      }
      users.get(userId)!.push(deposit);
    });

    return users;
  });

  readonly recentDeposits = computed(() => {
    const deposits = this._deposits();
    return deposits
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  // Deposit Methods
  getDeposits(activityId: string, filters: DepositedFilesFilters = {}): Observable<ApiResponse<DepositedFilesResponse>> {
    this._isLoading.set(true);
    this._error.set(null);
    this._currentFilters.set(filters);
    this._currentActivityId.set(activityId);

    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.user) params = params.set('userId', filters.user);
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);

    return this.http.get<ApiResponse<DepositedFilesResponse>>(`${this.baseUrl}/${activityId}/deposits`, { params })
      .pipe(
        tap(response => {
          if (response.success) {
            this._deposits.set(response.data.deposits);
            this._pagination.set(response.data.pagination);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getMyDeposit(activityId: string): Observable<ApiResponse<MyDepositedFilesResponse>> {
    this._isLoading.set(true);
    this._error.set(null);
    this._currentActivityId.set(activityId);

    return this.http.get<ApiResponse<MyDepositedFilesResponse>>(`${this.baseUrl}/${activityId}/deposits/my`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._myDeposit.set(response.data.deposit);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  submitFiles(activityId: string, files: File[]): Observable<ApiResponse<{ deposit: DepositedFilesWithDetails }>> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<ApiResponse<{ deposit: DepositedFilesWithDetails }>>(`${this.baseUrl}/${activityId}/deposits`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            this._myDeposit.set(response.data.deposit);

            // Add to deposits list if we're viewing the same activity
            if (this._currentActivityId() === activityId) {
              const currentDeposits = this._deposits();
              this._deposits.set([response.data.deposit, ...currentDeposits]);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  updateFiles(activityId: string, files: File[]): Observable<ApiResponse<{ deposit: DepositedFilesWithDetails }>> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.put<ApiResponse<{ deposit: DepositedFilesWithDetails }>>(`${this.baseUrl}/${activityId}/deposits`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            this._myDeposit.set(response.data.deposit);

            // Update in deposits list if we're viewing the same activity
            if (this._currentActivityId() === activityId) {
              const currentDeposits = this._deposits();
              const updatedDeposits = currentDeposits.map(deposit =>
                deposit.user._id === response.data.deposit.user._id ? response.data.deposit : deposit
              );
              this._deposits.set(updatedDeposits);
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  deleteDeposit(activityId: string): Observable<ApiResponse<DeleteDepositResponse>> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<ApiResponse<DeleteDepositResponse>>(`${this.baseUrl}/${activityId}/deposits`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._myDeposit.set(null);

            // Remove from deposits list if we're viewing the same activity
            if (this._currentActivityId() === activityId) {
              const currentUserId = this.authService.user()?._id;
              if (currentUserId) {
                const currentDeposits = this._deposits();
                const updatedDeposits = currentDeposits.filter(deposit => deposit.user._id !== currentUserId);
                this._deposits.set(updatedDeposits);
              } else {
                // Fallback to refreshing the entire list if user ID is not available
                this.refreshDeposits();
              }
            }
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getDepositById(activityId: string, depositId: string): Observable<ApiResponse<{ deposit: DepositedFilesWithDetails }>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<{ deposit: DepositedFilesWithDetails }>>(`${this.baseUrl}/${activityId}/deposits/${depositId}`)
      .pipe(
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  getDepositStats(activityId: string): Observable<ApiResponse<DepositStatsResponse>> {
    this._isLoading.set(true);

    return this.http.get<ApiResponse<DepositStatsResponse>>(`${this.baseUrl}/${activityId}/deposits/stats`)
      .pipe(
        tap(response => {
          if (response.success) {
            this._depositStats.set(response.data);
          }
        }),
        catchError(error => this.handleError(error)),
        tap(() => this._isLoading.set(false))
      );
  }

  // Utility Methods
  refreshDeposits(): void {
    const activityId = this._currentActivityId();
    if (activityId) {
      const currentFilters = this._currentFilters();
      this.getDeposits(activityId, currentFilters).subscribe();
    }
  }

  refreshMyDeposit(): void {
    const activityId = this._currentActivityId();
    if (activityId) {
      this.getMyDeposit(activityId).subscribe();
    }
  }

  refreshStats(): void {
    const activityId = this._currentActivityId();
    if (activityId) {
      this.getDepositStats(activityId).subscribe();
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  clearDeposits(): void {
    this._deposits.set([]);
    this._pagination.set(null);
  }

  clearMyDeposit(): void {
    this._myDeposit.set(null);
  }

  clearStats(): void {
    this._depositStats.set(null);
  }

  clearAll(): void {
    this.clearDeposits();
    this.clearMyDeposit();
    this.clearStats();
    this._currentActivityId.set(null);
  }

  // Helper methods
  getFileCount(deposit: DepositedFilesWithDetails): number {
    return deposit.files.length;
  }

  getFileSizeDisplay(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  getFileTypeIcon(filename: string): string {
    const extension = this.getFileExtension(filename);

    // Document types
    if (['pdf'].includes(extension)) return 'picture_as_pdf';
    if (['doc', 'docx'].includes(extension)) return 'description';
    if (['xls', 'xlsx'].includes(extension)) return 'table_chart';
    if (['ppt', 'pptx'].includes(extension)) return 'slideshow';
    if (['txt'].includes(extension)) return 'article';

    // Media types
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(extension)) return 'movie';
    if (['mp3', 'wav', 'flac', 'aac'].includes(extension)) return 'audiotrack';

    // Archive types
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'archive';

    // Code types
    if (['js', 'ts', 'html', 'css', 'php', 'py', 'java', 'cpp', 'c'].includes(extension)) return 'code';

    return 'insert_drive_file';
  }

  isImageFile(filename: string): boolean {
    const extension = this.getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension);
  }

  validateFiles(files: File[], maxFiles: number, restrictedFileTypes?: string[]): string[] {
    const errors: string[] = [];

    if (files.length === 0) {
      errors.push('At least one file is required');
      return errors;
    }

    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
    }

    if (restrictedFileTypes && restrictedFileTypes.length > 0) {
      for (const file of files) {
        const extension = this.getFileExtension(file.name);
        const isAllowed = this.isFileTypeAllowed(extension, restrictedFileTypes);
        if (!isAllowed) {
          errors.push(`File type .${extension} is not allowed`);
        }
      }
    }

    // Check file sizes (example: 10MB limit per file)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      if (file.size > maxFileSize) {
        errors.push(`File "${file.name}" exceeds 10MB size limit`);
      }
    }

    return errors;
  }

  private isFileTypeAllowed(extension: string, restrictedFileTypes: string[]): boolean {
    // Create a comprehensive mapping of file type categories to extensions
    const fileTypeMapping: Record<string, string[]> = {
      // Document types
      'documents': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
      'document': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
      'pdf': ['pdf'],
      'word': ['doc', 'docx'],
      'text': ['txt', 'rtf'],
      
      // Spreadsheet types
      'spreadsheets': ['xls', 'xlsx', 'csv', 'ods'],
      'spreadsheet': ['xls', 'xlsx', 'csv', 'ods'],
      'excel': ['xls', 'xlsx'],
      'csv': ['csv'],
      
      // Presentation types
      'presentations': ['ppt', 'pptx', 'odp'],
      'presentation': ['ppt', 'pptx', 'odp'],
      'powerpoint': ['ppt', 'pptx'],
      
      // Image types
      'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico'],
      'image': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico'],
      'photo': ['jpg', 'jpeg', 'png', 'bmp', 'tiff'],
      'vector': ['svg'],
      
      // Video types
      'videos': ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'],
      'video': ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'],
      
      // Audio types
      'audio': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
      'sound': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
      
      // Archive types
      'archives': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
      'archive': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
      'compressed': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
      
      // Code types
      'code': ['js', 'ts', 'html', 'css', 'php', 'py', 'java', 'cpp', 'c', 'cs', 'rb', 'go', 'rs'],
      'programming': ['js', 'ts', 'html', 'css', 'php', 'py', 'java', 'cpp', 'c', 'cs', 'rb', 'go', 'rs'],
      'web': ['html', 'css', 'js', 'ts'],
      'javascript': ['js', 'ts'],
      'python': ['py'],
      'java': ['java'],
      
      // Specific extensions
      'executable': ['exe', 'msi', 'app', 'deb', 'rpm'],
      'font': ['ttf', 'otf', 'woff', 'woff2', 'eot']
    };

    // Check each restricted file type
    for (const restrictedType of restrictedFileTypes) {
      const normalizedType = restrictedType.toLowerCase().trim();
      
      // Direct extension match (e.g., "pdf", ".pdf")
      const cleanExtension = normalizedType.startsWith('.') ? normalizedType.substring(1) : normalizedType;
      if (cleanExtension === extension) {
        return true;
      }
      
      // Category match (e.g., "documents", "images")
      if (fileTypeMapping[normalizedType]) {
        if (fileTypeMapping[normalizedType].includes(extension)) {
          return true;
        }
      }
      
      // MIME type pattern match (e.g., "image/*", "application/pdf")
      if (normalizedType.includes('/')) {
        const [mainType, subType] = normalizedType.split('/');
        if (subType === '*') {
          // Wildcard MIME type (e.g., "image/*")
          const categoryExtensions = fileTypeMapping[mainType] || fileTypeMapping[`${mainType}s`];
          if (categoryExtensions && categoryExtensions.includes(extension)) {
            return true;
          }
        } else {
          // Specific MIME type (e.g., "application/pdf")
          const mimeToExtension: Record<string, string[]> = {
            'application/pdf': ['pdf'],
            'application/msword': ['doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
            'application/vnd.ms-excel': ['xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
            'application/vnd.ms-powerpoint': ['ppt'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
            'text/plain': ['txt'],
            'text/csv': ['csv'],
            'image/jpeg': ['jpg', 'jpeg'],
            'image/png': ['png'],
            'image/gif': ['gif'],
            'image/svg+xml': ['svg'],
            'video/mp4': ['mp4'],
            'video/quicktime': ['mov'],
            'audio/mpeg': ['mp3'],
            'audio/wav': ['wav'],
            'application/zip': ['zip'],
            'application/x-rar-compressed': ['rar']
          };
          
          if (mimeToExtension[normalizedType] && mimeToExtension[normalizedType].includes(extension)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
