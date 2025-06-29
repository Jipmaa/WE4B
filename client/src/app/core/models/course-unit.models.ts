import {BaseFilters} from '@/core/models/_shared.models';
import {CourseActivity} from '@/core/models/course-activity.models';
import {CourseGroup} from '@/core/models/course-group.models';


export interface CourseUnit {
  _id: string;
  slug: string;
  capacity: number;
  name: string;
  code: string;
  img?: string;
  groups?: CourseGroup[];
  activities: CourseUnitActivitiesCategory[];
  userRole?: 'student' | 'teacher'; // User's role in this specific course
  type: 'CS' | 'TM' | 'EC' | 'OM' | 'QC';
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseUnitActivitiesCategory {
  _id: string;
  name: string;
  description: string;
  activities: string[] | CourseActivity[];
}

// Populated version for when activities are fully loaded
export interface CourseUnitActivitiesCategoryPopulated {
  _id: string;
  name: string;
  description: string;
  activities: CourseActivity[];
}

// CourseUnit with populated activities and groups
export interface CourseUnitPopulated extends Omit<CourseUnit, 'activities' | 'groups'> {
  activities: CourseUnitActivitiesCategoryPopulated[];
  groups: CourseGroup[];
}

export interface CourseUnitFilters extends BaseFilters {
  minCapacity?: number;
  maxCapacity?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'code' | 'type' | 'capacity';
}

export interface CreateCourseUnitRequest {
  name: string;
  code: string;
  slug: string;
  capacity: number;
  type: 'CS' | 'TM' | 'EC' | 'OM' | 'QC';
  img?: string;
}

export interface UpdateCourseUnitRequest {
  name?: string;
  code?: string;
  slug?: string;
  capacity?: number;
  type?: 'CS' | 'TM' | 'EC' | 'OM' | 'QC';
  img?: string;
}

export interface CourseUnitsResponse {
  courseUnits: CourseUnit[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCourseUnits: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CreateCourseUnitsResponse {
  course: CourseUnit;
}
