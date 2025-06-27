import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@/core/services/auth.service';
import { UserRole } from '@/core/models/auth.models';

/**
 * Guard that checks if user is authenticated
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    // Store the attempted URL for redirecting after login
    router.navigate(['/accounts/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  return true;
};

/**
 * Guard that redirects authenticated users away from accounts pages
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isAuthenticated();

  if (isAuthenticated) {
    // Redirect authenticated users to dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

/**
 * Factory function to create role-based guards
 */
export const createRoleGuard = (requiredRoles: UserRole[]): CanActivateFn => {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // First check if user is authenticated
    if (!authService.isAuthenticated()) {
      router.navigate(['/accounts/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    // Check if user has required roles
    const hasRequiredRole = authService.canAccess(requiredRoles);

    if (!hasRequiredRole) {
      // User doesn't have required permissions
      router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  };
};

/**
 * Guard for admin-only routes
 */
export const adminGuard: CanActivateFn = createRoleGuard(['admin']);

/**
 * Guard for teacher or admin routes
 */
export const teacherGuard: CanActivateFn = createRoleGuard(['teacher', 'admin']);

/**
 * Guard for student routes (any authenticated user)
 */
export const studentGuard: CanActivateFn = createRoleGuard(['student', 'teacher', 'admin']);

/**
 * Advanced guard that can handle multiple conditions
 */
export const conditionalGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check authentication first
  if (!authService.isAuthenticated()) {
    router.navigate(['/accounts/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Get required roles from route data
  const requiredRoles = route.data?.['roles'] as UserRole[] || [];

  // Get required permissions from route data
  const requiredPermissions = route.data?.['permissions'] as string[] || [];

  // Check roles
  if (requiredRoles.length > 0 && !authService.canAccess(requiredRoles)) {
    router.navigate(['/unauthorized']);
    return false;
  }

  // Additional custom conditions can be added here
  const customCondition = route.data?.['customCondition'] as () => boolean;
  if (customCondition && !customCondition()) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};

/**
 * Guard that checks if user's email is verified
 */
export const emailVerifiedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/accounts/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  const user = authService.user();
  if (user && !user.isEmailVerified) {
    router.navigate(['/auth/verify-email']);
    return false;
  }

  return true;
};

/**
 * Guard that checks if user account is active
 */
export const activeUserGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/accounts/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  const user = authService.user();
  if (user && !user.isActive) {
    router.navigate(['/account-suspended']);
    return false;
  }

  return true;
};

/**
 * Composite guard that combines authentication, email verification, and active status
 */
export const fullAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check authentication
  if (!authService.isAuthenticated()) {
    router.navigate(['/accounts/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  const user = authService.user();

  // Check if account is active
  if (user && !user.isActive) {
    router.navigate(['/account-suspended']);
    return false;
  }

  // Check if email is verified (if required for the route)
  const requireEmailVerification = route.data?.['requireEmailVerification'] as boolean;
  if (requireEmailVerification && user && !user.isEmailVerified) {
    router.navigate(['/auth/verify-email']);
    return false;
  }

  return true;
};
