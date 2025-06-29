import { User } from '@/core/models/user.models';
import { CourseActivity } from '@/core/models/course-activity.models';

export interface DepositedFiles {
  _id: string;
  activity: string;
  user: string;
  files: string[];
  evaluation?: {
    grade?: number;
    comment?: string;
    gradedBy?: string;
    gradedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DepositedFilesWithDetails extends Omit<DepositedFiles, 'activity' | 'user'> {
  activity: CourseActivity;
  user: User;
  fileUrls?: string[];
}

export interface FileDepositSubmissionRequest {
  files: File[];
}

export interface DepositedFilesResponse {
  deposits: DepositedFilesWithDetails[];
  activity: {
    id: string;
    title: string;
    maxFiles: number;
    restrictedFileTypes?: string[];
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalDeposits: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MyDepositedFilesResponse {
  deposit: DepositedFilesWithDetails | null;
  activity: {
    id: string;
    title: string;
    maxFiles: number;
    restrictedFileTypes?: string[];
  };
}

export interface DepositStatsResponse {
  activity: {
    id: string;
    title: string;
    maxFiles: number;
    restrictedFileTypes?: string[];
  };
  stats: {
    totalSubmissions: number;
    uniqueSubmitters: number;
    submissionRate: number;
    courseCapacity?: number;
  };
  recentSubmissions: Array<{
    user: User;
    createdAt: Date;
    fileCount: number;
  }>;
}

export interface DeleteDepositResponse {
  deletedSubmission: {
    id: string;
    activityId: string;
    fileCount: number;
  };
}

export interface GradeDepositRequest {
  grade?: number;
  comment?: string;
}

export interface GradeDepositResponse {
  deposit: DepositedFilesWithDetails;
}

export interface TeacherDepositsResponse {
  deposits: Array<DepositedFilesWithDetails & {
    isLate: boolean;
    student: {
      name: string;
      groups: string[];
    };
  }>;
  activity: {
    id: string;
    title: string;
    dueAt?: Date;
    maxFiles: number;
    restrictedFileTypes?: string[];
  };
}
