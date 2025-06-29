import { User } from './user.models';
import { CourseUnit } from './course-unit.models';
import {CourseActivity, FileDepositoryActivity} from './course-activity.models';

export type RecentActivityAction = 'create' | 'update' | 'submit' | 'grade' | 'add_to_course' | 'due_soon' | 'overdue';

export type RecentActivityUser = Pick<User, '_id' | 'fullName'> & { imageUrl: string | null};

export interface ActivityActor {
  kind: 'user' | 'system';
  data: RecentActivityUser | string;
}

export interface RecentActivity {
  _id: string;
  actor: ActivityActor;
  date: string;
  course: Pick<CourseUnit, '_id' | 'code' | 'slug'>;
  activity?: Pick<CourseActivity, '_id' | 'title'> | Pick<FileDepositoryActivity, '_id' | 'title' | 'dueAt'>;
  action: RecentActivityAction;
  targetUser?: RecentActivityUser;
  metadata?: {
    filesCount?: number;
    grade?: number;
    completionPercentage?: number;
    overduePeriod?: string;
    overdueStudentCount?: number;
    overdueStudentNames?: string[];
  };
  createdAt: string;
  updatedAt: string;
}
