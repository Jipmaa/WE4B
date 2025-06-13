import { Routes } from "@angular/router";
import {CoursesPage} from '@/features/course/components/courses-page/courses-page';
import {CoursePage} from '@/features/course/components/course-page/course-page';
import {CourseMembersPage} from '@/features/course/components/course-members-page/course-members-page';

export const courseRoutes: Routes = [
  {
    path: '',
    component: CoursesPage
  },
  {
    path: '/:slug',
    component: CoursePage
  },
  {
    path: '/:slug/members',
    component: CourseMembersPage
  }
]
