export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  roles: UserRole[];
  department?: string;
  birthdate: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

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

// API Response structure based on your backend
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    status: number;
    details?: any;
  };
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
