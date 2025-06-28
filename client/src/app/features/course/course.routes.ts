import { Routes } from "@angular/router";
import {CoursesPage} from '@/features/course/components/courses-page/courses-page';
import {CoursePage} from '@/features/course/components/course-page/course-page';
import {CourseMembersPage} from '@/features/course/components/course-members-page/course-members-page';
import {ActivityDisplayPage} from '@/features/course/components/activity-display-page/activity-display-page';
import { courseAccessGuard } from './guards';

export const courseRoutes: Routes = [
  {
    path: '',
    component: CoursesPage
  },
  {
    path: ':slug',
    component: CoursePage,
    canActivate: [courseAccessGuard]
  },
  {
    path: ':slug/members',
    component: CourseMembersPage,
    canActivate: [courseAccessGuard]
  },
  {
    path: ':slug/activity/:activityId',
    component: ActivityDisplayPage,
    canActivate: [courseAccessGuard]
  }
]
