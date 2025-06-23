import { BaseFilters } from '@/core/models/_shared.models';
import { User } from '@/core/models/user.models';

export interface CourseGroup {
  _id: string;
  name: string;
  description?: string;
  courseUnit: string;
  members: string[];
  maxMembers?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseGroupWithMembers extends Omit<CourseGroup, 'members'> {
  members: User[];
}

export interface CourseGroupFilters extends BaseFilters {
  courseUnit?: string;
  createdBy?: string;
  hasMembers?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'memberCount';
}

export interface CreateCourseGroupRequest {
  name: string;
  description?: string;
  courseUnit: string;
  maxMembers?: number;
}

export interface UpdateCourseGroupRequest {
  name?: string;
  description?: string;
  maxMembers?: number;
}

export interface AddUserToCourseGroupRequest {
  userId: string;
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