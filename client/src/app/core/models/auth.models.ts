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
