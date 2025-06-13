import {UserRole} from '@/core/models/user.models';
import {BaseFilters} from '@/core/models/_shared.models';

export interface CourseUnit {
  _id: string;
  slug: string;
  capacity: number;
  name: string;
  code: string;
  img_path?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseUnitFilters extends BaseFilters {
  minCapacity?: number;
  maxCapacity?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'code' | 'capacity';
}

export interface CourseUnitStats {
  overview: {
    totalCourseUnits: number;
    totalCapacity: number;
    averageCapacity: number;
    minCapacity: number;
    maxCapacity: number;
  };
  capacityDistribution: Array<{
    _id: string | number;
    count: number;
    courseUnits: Array<{
      name: string;
      code: string;
      capacity: number;
    }>;
  }>;
  recentCourseUnits: CourseUnit[];
  topCapacityCourseUnits: CourseUnit[];
}

// Search Results
export interface SearchResult<T> {
  items: T[];
  count: number;
  query?: string;
}

// Form Data Types
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  department?: string;
  birthdate?: Date;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  department?: string;
  birthdate?: Date;
  avatar?: string;
}

export interface UpdateUserRolesRequest {
  roles: UserRole[];
}

export interface CreateCourseUnitRequest {
  name: string;
  code: string;
  slug: string;
  capacity: number;
  img_path?: string;
}

export interface UpdateCourseUnitRequest {
  name?: string;
  code?: string;
  slug?: string;
  capacity?: number;
  img_path?: string;
}

export interface CourseUnitsResponse {
  courseUnits: CourseUnit[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCourseUnits: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CourseUnitSearchResult {
  courseUnits: CourseUnit[];
  count: number;
}

export interface CapacityRangeResponse {
  courseUnits: CourseUnit[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCourseUnits: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  capacityRange: {
    min: number;
    max: number;
  };
}

export type CourseUnitSortBy = 'createdAt' | 'updatedAt' | 'name' | 'code' | 'capacity';
