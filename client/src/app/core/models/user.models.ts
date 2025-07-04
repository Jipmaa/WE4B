import {BaseFilters} from '@/core/models/_shared.models';

export type UserRole = 'student' | 'teacher' | 'admin';

export type StudentDepartment = 'Common core' | 'Computer Science' | 'Energy' | 'EDIM' | 'IMSI' | 'GMC';

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  fullName: string;
  avatar?: string;
  roles: UserRole[];
  department?: StudentDepartment;
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
  department?: StudentDepartment;
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
  department?: StudentDepartment;
  birthdate?: Date;
  avatar?: string;
  phone?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthdate: Date | string;
  phone?: string;
  roles?: UserRole[];
  department?: StudentDepartment;
  avatar?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface CreateUserResponse {
  user: User;
}
