import mongoose, { Document, Schema, Types } from 'mongoose';
import {getCurrentAcademicPeriod} from "../utils/academic-period";
import CourseGroup from "./course-group";
import { getPresignedUrl, FILE_CONFIGS } from '../services/minio-service';

// --- Type Definitions ---
const messageLevelValues = ['normal', 'important', 'urgent'] as const;
const fileTypeValues = ['text-file', 'image', 'presentation', 'video', 'audio', 'spreadsheet', 'archive', 'other'] as const;
const activityTypeValues = ['message', 'file', 'file-depository'] as const;

// --- TypeScript Interface Definitions ---

// Base interface that all activities will extend
export interface CourseActivity extends Document {
	_id: Types.ObjectId;
	activityType: typeof activityTypeValues[number]; // This is our discriminator key
	courseUnit: Types.ObjectId;
	restrictedGroups?: Types.ObjectId[];
	isPinned: boolean;
	completion: {
		user: Types.ObjectId;
		completedAt: Date;
	}[];
	createdAt: Date;
	updatedAt: Date;

	// --- Methods ---
	getCompletionRate(): Promise<number>;
}

// Interface for Message Activity
export interface MessageActivity extends CourseActivity {
	title: string;
	content: string;
	level: typeof messageLevelValues[number];
}

// Interface for File Activity
export interface FileActivity extends CourseActivity {
	title: string;
	content: string;
	fileType: typeof fileTypeValues[number];
	file: string; // MinIO object key
	getFileUrl(): Promise<string>;
}

// Interface for File Depository Activity
export interface FileDepositoryActivity extends CourseActivity {
	title: string;
	content: string;
	instructions: ({ type: 'file', file: string } | { type: 'text', text: string });
	restrictedFileTypes?: (typeof fileTypeValues[number])[];
	maxFiles: number;
	dueAt?: Date;
	getInstructionsFileUrl(): Promise<string | null>;
}

// --- Base Mongoose Schema ---
// This schema contains all the fields that are common across all activity types.

const baseActivitySchema = new Schema<CourseActivity>({
	activityType: { // This field will determine which discriminator to use
		type: String,
		required: true,
		enum: activityTypeValues,
	},
	courseUnit: {
		type: Schema.Types.ObjectId,
		ref: 'CourseUnit',
		required: true,
	},
	restrictedGroups: [{
		type: Schema.Types.ObjectId,
		ref: 'CourseGroup',
	}],
	isPinned: {
		type: Boolean,
		default: false,
	},
	completion: [{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		completedAt: {
			type: Date,
			required: true,
			default: Date.now,
		},
		_id: false
	}],
}, {
	timestamps: true,
	discriminatorKey: 'activityType',
	toJSON: { virtuals: true, transform: (doc, ret) => { delete ret.__v; delete ret.id; return ret; } },
	toObject: { virtuals: true, transform: (doc, ret) => { delete ret.__v; delete ret.id; return ret; } }
});

// --- Schema Methods ---
baseActivitySchema.methods.getCompletionRate = async function(): Promise<number> {
	const completedCount = this.completion.length;
	if (completedCount === 0) {
		return 0;
	}

	const { year, semester } = getCurrentAcademicPeriod();
	let relevantGroups;

	// Determine which groups are relevant for this activity
	if (this.restrictedGroups && this.restrictedGroups.length > 0) {
		// If restricted, only consider those specific groups
		relevantGroups = await CourseGroup.find({
			_id: { $in: this.restrictedGroups }
		});
	} else {
		// If not restricted, consider all groups within the course unit
		relevantGroups = await CourseGroup.find({
			courseUnit: this.courseUnit
		});
	}

	// From the relevant groups, get a unique set of student IDs for the current academic period
	const studentIds = new Set<string>();
	for (const group of relevantGroups) {
		for (const user of group.users) {
			if (user.role === 'student' && user.year === year && user.semester === semester) {
				studentIds.add(user.user.toString());
			}
		}
	}

	const totalStudents = studentIds.size;

	if (totalStudents === 0) {
		return 0; // Avoid division by zero
	}

	// Calculate and return the completion rate
	const rate = (completedCount / totalStudents) * 100;
	return Math.round(rate * 100) / 100; // Round to two decimal places
};


// --- Create the Base Model ---
// All other models will be extensions of this one.
export const CourseActivityModel = mongoose.model<CourseActivity>('CourseActivity', baseActivitySchema);


// --- Create Discriminator Schemas and Models ---

// 1. Message Activity
const messageActivitySchema = new Schema<MessageActivity>({
	title: { type: String, required: true, trim: true },
	content: { type: String, required: true },
	level: { type: String, enum: messageLevelValues, default: 'normal' },
});
export const MessageActivityModel = CourseActivityModel.discriminator<MessageActivity>('message', messageActivitySchema);


// 2. File Activity
const fileActivitySchema = new Schema<FileActivity>({
	title: { type: String, required: true, trim: true },
	content: { type: String, required: true },
	fileType: { type: String, enum: fileTypeValues, required: true },
	file: { type: String, required: true },
});

fileActivitySchema.methods.getFileUrl = async function(this: FileActivity): Promise<string> {
	try {
		return await getPresignedUrl(FILE_CONFIGS.activityFile.bucket, this.file);
	} catch (error) {
		console.warn('Failed to generate file URL:', error);
		throw error;
	}
};

export const FileActivityModel = CourseActivityModel.discriminator<FileActivity>('file', fileActivitySchema);


// 3. File Depository Activity
const fileDepositoryActivitySchema = new Schema<FileDepositoryActivity>({
	title: { type: String, required: true, trim: true },
	content: { type: String, required: true },
	instructions: {
		type: new Schema({
			type: { type: String, enum: ['file', 'text'], required: true },
			file: { type: String },
			text: { type: String }
		}, { _id: false }),
		required: true,
	},
	restrictedFileTypes: [{ type: String, enum: fileTypeValues }],
	maxFiles: { type: Number, required: true, min: 1, default: 1 },
	dueAt: { type: Date },
});

fileDepositoryActivitySchema.methods.getInstructionsFileUrl = async function(this: FileDepositoryActivity): Promise<string | null> {
	if (this.instructions.type === 'file' && this.instructions.file) {
		try {
			return await getPresignedUrl(FILE_CONFIGS.activityFile.bucket, this.instructions.file);
		} catch (error) {
			console.warn('Failed to generate instructions file URL:', error);
			throw error;
		}
	}
	return null;
};

export const FileDepositoryActivityModel = CourseActivityModel.discriminator<FileDepositoryActivity>('file-depository', fileDepositoryActivitySchema);
