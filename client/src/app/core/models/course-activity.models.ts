import { BaseFilters } from '@/core/models/_shared.models';

export type CourseActivityType = 'message' | 'file' | 'file-depository';
export type MessageLevel = 'normal' | 'important' | 'urgent';
export type FileType = 'text-file' | 'image' | 'presentation' | 'video' | 'audio' | 'spreadsheet' | 'archive' | 'other';

interface BaseCourseActivity {
  _id: string;
  courseUnit: string;
  restrictedGroups?: string[];
  isPinned: boolean;
  completion: {
    user: string;
    completedAt: Date;
  }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CourseActivity =
  | {
      activityType: 'message';
      title: string;
      content: string;
      level: MessageLevel;
    } & BaseCourseActivity
  | {
      activityType: 'file';
      title: string;
      content: string;
      fileType: FileType;
      file: string;
    } & BaseCourseActivity
  | {
      activityType: 'file-depository';
      title: string;
      content: string;
      instructions: { type: 'file'; file: string; fileUrl?: string } | { type: 'text'; text: string };
      restrictedFileTypes?: FileType[];
      maxFiles: number;
      dueAt?: Date;
    } & BaseCourseActivity;

export type MessageActivity = Extract<CourseActivity, { activityType: 'message' }>;
export type FileActivity = Extract<CourseActivity, { activityType: 'file' }>;
export type FileDepositoryActivity = Extract<CourseActivity, { activityType: 'file-depository' }>;

export interface CourseActivityFilters extends BaseFilters {
  activityType?: CourseActivityType;
  courseUnit?: string;
  createdBy?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'type' | 'activityType';
}

export interface CreateMessageActivityRequest {
  title: string;
  content: string;
  level?: MessageLevel;
  courseUnit: string;
}

export interface CreateFileActivityRequest {
  title: string;
  content: string;
  courseUnit: string;
  file?: File;
  fileType: FileType;
}

export interface CreateFileDepositoryActivityRequest {
  title: string;
  content: string;
  courseUnit: string;
  instructions: { type: 'file'; file: string; fileUrl?: string } | { type: 'text'; text: string };
  maxFiles: number;
  restrictedFileTypes?: FileType[];
  dueAt?: Date;
}

export interface UpdateMessageActivityRequest {
  title?: string;
  content?: string;
  level?: MessageLevel;
  category?: string;
}

export interface UpdateFileActivityRequest {
  title?: string;
  content?: string;
  file?: File;
  fileType?: FileType;
  category?: string;
}

export interface UpdateFileDepositoryActivityRequest {
  title?: string;
  content?: string;
  instructions?: { type: 'file'; file: string; fileUrl?: string } | { type: 'text'; text: string };
  maxFiles?: number;
  restrictedFileTypes?: FileType[];
  dueAt?: Date;
  category?: string;
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
