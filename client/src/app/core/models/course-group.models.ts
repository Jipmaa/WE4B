import { BaseFilters } from '@/core/models/_shared.models';
import { User } from '@/core/models/user.models';

export type GroupKind = 'theoretical' | 'practical' | 'laboratory' | 'other';
export type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type UserRole = 'student' | 'teacher';

export interface CourseGroupUser {
  user: string;
  role: UserRole;
  semester?: 1 | 2;
  year?: string;
}

export interface PopulatedGroupUser {
  user: User;
  role: 'student' | 'teacher';
  semester: number;
  year: string;
}

export interface CourseGroup {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  kind: GroupKind;
  day: Day;
  from: string;
  to: string;
  semester: 1 | 2;
  courseUnit: string;
  users: CourseGroupUser[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseGroupFilters extends BaseFilters {
  courseUnit?: string;
  createdBy?: string;
  hasMembers?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'memberCount';
}

export interface CreateCourseGroupRequest {
  slug: string;
  name: string;
  description?: string;
  kind: GroupKind;
  day: Day;
  from: string;
  to: string;
  semester: 1 | 2;
  courseUnit: string;
}

export interface UpdateCourseGroupRequest {
  slug?: string;
  name?: string;
  description?: string;
  kind?: GroupKind;
  day?: Day;
  from?: string;
  to?: string;
  semester?: 1 | 2;
}

export interface AddUserToCourseGroupRequest {
  userId: string;
  role: UserRole;
  semester?: 1 | 2;
  year?: string;
}

export interface CourseGroupsResponse {
  groups: CourseGroup[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalGroups: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CourseGroupSearchResult {
  groups: CourseGroup[];
  count: number;
}

export interface CourseGroupMembersResponse {
  members: User[];
  group: {
    id: string;
    name: string;
    maxMembers?: number;
    currentMemberCount: number;
  };
}

export interface PopulatedCourseGroup {
  _id: string;
  slug: string;
  name: string;
  kind: string;
  day: string;
  from: string;
  to: string;
  semester: number;
  createdAt: string;
  updatedAt: string;
  courseUnit: {
    name: string;
    code: string;
    slug: string;
  };
  users: PopulatedGroupUser[];
}

export interface CourseGroupsByCourseUnitResponse {
  courseUnit: {
    id: string;
    name: string;
    code: string;
    slug: string;
  };
  groups: PopulatedCourseGroup[];
  count: number;
}
