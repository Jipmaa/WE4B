export type {
  User,
  UserRole
} from './user.models';

import {
  User,
  UserRole
} from './user.models';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthdate: string; // ISO string
  department?: string;
  phone?: string;
  roles?: UserRole[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  department?: string;
  birthdate?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface JwtPayload {
  userId: string;
  iat: number; // issued at
  exp: number; // expires at
}

// Utility types
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

// Permission types based on your roles
export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  condition?: any;
}

export interface RolePermissions {
  student: Permission[];
  teacher: Permission[];
  admin: Permission[];
}
