import { Routes } from "@angular/router";
import {CoursesPage} from '@/features/course/components/courses-page/courses-page';
import {CoursePage} from '@/features/course/components/course-page/course-page';
import {CourseMembersPage} from '@/features/course/components/course-members-page/course-members-page';
import {AddGroupPageComponent} from "./components/add-group-page/add-group-page";
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
    path: ':slug/add-group',
    component: AddGroupPageComponent,
    canActivate: [courseAccessGuard]
  }
]
