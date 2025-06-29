// Common API Response Structure
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Pagination Interfaces
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Common Filter Base
export interface BaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Dashboard Types
export interface DepositDetailsForTeacher {
  name: string;  // `${course.name} — ${activity.name}`
  url: string;  // /courses/:courseUnit-slug/activity/:activity-id
  missingStudentDeposits: number;  // From CourseGroup to get the list of students and DepositedFiles for each student work
  feedbackRate: number;  // in the DepositedFiles
  dueAt?: Date;  // Due date for the file deposit activity
}
