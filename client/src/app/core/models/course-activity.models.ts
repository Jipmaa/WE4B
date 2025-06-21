import { BaseFilters } from '@/core/models/_shared.models';

export type CourseActivityType = 'message' | 'file' | 'file-depository';

export interface CourseActivity {
  _id: string;
  title: string;
  description: string;
  type: CourseActivityType;
  courseUnit: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageActivity extends CourseActivity {
  type: 'message';
  content: string;
}

export interface FileActivity extends CourseActivity {
  type: 'file';
  file: string;
  originalFileName?: string;
}

export interface FileDepositoryActivity extends CourseActivity {
  type: 'file-depository';
  maxFiles: number;
  restrictedFileTypes?: string[];
}

export interface CourseActivityFilters extends BaseFilters {
  type?: CourseActivityType;
  courseUnit?: string;
  createdBy?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'type';
}

export interface CreateMessageActivityRequest {
  title: string;
  description: string;
  content: string;
  courseUnit: string;
}

export interface CreateFileActivityRequest {
  title: string;
  description: string;
  courseUnit: string;
  file?: File;
}

export interface CreateFileDepositoryActivityRequest {
  title: string;
  description: string;
  courseUnit: string;
  maxFiles: number;
  restrictedFileTypes?: string[];
}

export interface CourseActivitiesResponse {
  activities: CourseActivity[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalActivities: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CourseActivitySearchResult {
  activities: CourseActivity[];
  count: number;
}