import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '@/core/services/auth.service';
import { CourseUnitsService } from '@/core/services/course-units.service';

export const courseAccessGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const courseUnitsService = inject(CourseUnitsService);
  const router = inject(Router);

  const courseSlug = route.paramMap.get('slug');

  if (!courseSlug) {
    return router.createUrlTree(['/dashboard']);
  }

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/accounts/login']);
  }

  // Check if user course units are loaded
  if (!courseUnitsService.hasUserCourseUnits()) {
    return courseUnitsService.getUserCourseUnits().pipe(
      map(() => {
        const hasAccess = courseUnitsService.hasAccessToCourseUnit(courseSlug);
        if (!hasAccess) {
          return router.createUrlTree(['/dashboard']);
        }
        return true;
      }),
      catchError(() => {
        return of(router.createUrlTree(['/dashboard']));
      })
    );
  }

  // Course units are already loaded, check access directly
  const hasAccess = courseUnitsService.hasAccessToCourseUnit(courseSlug);

  if (!hasAccess) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
