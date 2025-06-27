import mongoose, { Document, Schema, Types } from 'mongoose';

export interface RecentActivity extends Document {
    _id: Types.ObjectId;
    student?: Types.ObjectId; // Reference to the student
    teacher_admin?: Types.ObjectId; // Reference to the teacher or an administrator
    activityType: string; // Type of activity
    timestamp: Date; // When the activity occurred
    description?: string; // Optional description of the activity
    courseUnit?: Types.ObjectId; // Optional reference to a course unit
    courseGroup?: Types.ObjectId; // Optional reference to a course group
    numberOfFiles?: number; // Optional number of files involved in the activity
    grade?: number; // Optional grade associated with the activity
    activityName?: string; // Optional name of the activity
    percentCompleted?: number; // Optional percentage of completion for the activity
}

const recentActivitySchema = new Schema<RecentActivity>({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    teacher_admin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    activityType: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    courseUnit: {
        type: Schema.Types.ObjectId,
        ref: 'CourseUnit',
        index: true
    },
    courseGroup: {
        type: Schema.Types.ObjectId,
        ref: 'CourseGroup',
        index: true
    },
    percentCompleted: {
        type: Number,
        min: 0,
        max: 100
    },
    activityName: {
        type: String,
        trim: true
    },
    numberOfFiles: {
        type: Number,
        min: 0
    },
    grade: {
        type: Number,
        min: 0,
        max: 100
    }
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    toJSON: {
        transform(doc, ret) {
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        transform(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});