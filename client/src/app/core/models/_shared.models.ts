// Common API Response Structure
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Common Error Structure
export interface ApiError {
  message: string;
  status: number;
  stack?: string;
  details?: any;
}

// Pagination Interfaces
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

// Common Filter Base
export interface BaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Search Results
export interface SearchResult<T> {
  items: T[];
  count: number;
  query?: string;
}

// Utility Types
export type SortOrder = 'asc' | 'desc';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// State Management Types
export interface EntityState<T> {
  items: T[];
  selectedItem: T | null;
  isLoading: boolean;
  error: string | null;
  filters: any;
  pagination: PaginationInfo | null;
}

// HTTP Request Options
export interface RequestOptions {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: SortOrder;
  };
}

// Common Constants
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_SEARCH_DEBOUNCE = 300;
export const MAX_SEARCH_LENGTH = 50;

// Validation Patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
  PASSWORD: /^.{6,}$/,
  COURSE_CODE: /^[A-Z0-9]+$/,
  COURSE_SLUG: /^[a-z0-9-]+$/,
  NAME: /^[a-zA-Z\s]+$/,
} as const;
