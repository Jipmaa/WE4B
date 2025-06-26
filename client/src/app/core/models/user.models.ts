import {BaseFilters} from '@/core/models/_shared.models';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  roles: UserRole[];
  department?: string;
  birthdate: Date;
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLogin?: Date;
  memberOfGroups: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFilters extends BaseFilters {
  role?: UserRole;
  department?: string;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'lastLogin' | 'firstName' | 'lastName';
}

export interface UserStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
  };
  roleDistribution: Array<{ _id: UserRole; count: number; }>;
  departmentDistribution: Array<{ _id: string; count: number; }>;
  recentUsers: User[];
}

export interface UsersResponse {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface UserSearchResult {
  users: User[];
  count: number;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  department?: string;
  birthdate?: Date;
  avatar?: string;
  phone?: string;
}
