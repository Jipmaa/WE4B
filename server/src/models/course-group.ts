import mongoose, { Document, Schema, Types } from 'mongoose';
import { UserRole } from './user';

// Define the valid values for Day, GroupKind, and Semester
const dayValues = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const groupKindValues = ['theoretical', 'practical', 'laboratory', 'other'] as const;
const semesterValues = [1, 2] as const;

// Interface for the CourseGroup document
export interface CourseGroup extends Document {
	_id: Types.ObjectId;
	slug: string;
	name: string;
	description?: string;
	kind: typeof groupKindValues[number];
	day: typeof dayValues[number];
	from: string;
	to: string;
	semester: 1 | 2;
	createdAt: Date;
	updatedAt: Date;
	courseUnit: Types.ObjectId;
	users: {
		user: Types.ObjectId;
		role: Extract<UserRole, 'student' | 'teacher'>;
		semester?: 1 | 2;
		year?: string;
	}[];
}

// Mongoose Schema for CourseGroup
const courseGroupSchema = new Schema<CourseGroup>({
	slug: {
		type: String,
		required: [true, 'Slug is required.'],
		unique: true,
		trim: true,
	},
	name: {
		type: String,
		required: [true, 'Group name is required.'],
		trim: true,
		maxlength: [100, 'Group name cannot be more than 100 characters.'],
	},
	description: {
		type: String,
		trim: true,
		maxlength: [500, 'Description cannot be more than 500 characters.'],
		required: false, // Optional
	},
	kind: {
		type: String,
		enum: {
			values: groupKindValues,
			message: 'Invalid group kind: {VALUE}.',
		},
		required: [true, 'Group kind is required.'],
	},
	day: {
		type: String,
		enum: {
			values: dayValues,
			message: 'Invalid day: {VALUE}.',
		},
		required: [true, 'Day is required.'],
	},
	from: {
		type: String,
		required: [true, 'Start time is required.'],
		match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please enter a valid time format (HH:mm).'],
	},
	to: {
		type: String,
		required: [true, 'End time is required.'],
		match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please enter a valid time format (HH:mm).'],
	},
	semester: {
		type: Number,
		enum: {
			values: semesterValues,
			message: 'Invalid semester: {VALUE}.',
		},
		required: [true, 'Semester is required.'],
	},
	courseUnit: {
		type: Schema.Types.ObjectId,
		ref: 'CourseUnit',
		required: [true, 'Course Unit reference is required.'],
	},
	users: [{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		role: {
			type: String,
			enum: ['student', 'teacher'],
			required: true,
		},
		semester: {
			type: Number,
			enum: semesterValues,
		},
		year: {
			type: String,
			match: [/^\d{4}-\d{4}$/, 'Year must be in YYYY-YYYY format.'],
		},
		_id: false
	}],
}, {
	timestamps: true, // Automatically adds createdAt and updatedAt
	toJSON: {
		transform: (doc, ret) => {
			delete ret.__v;
			return ret;
		}
	},
	toObject: {
		transform: (doc, ret) => {
			delete ret.__v;
			return ret;
		}
	}
});

// --- Indexes ---
courseGroupSchema.index({ courseUnit: 1 });
courseGroupSchema.index({ "users.user": 1 });

// --- Model ---
const CourseGroup = mongoose.model<CourseGroup>('CourseGroup', courseGroupSchema);

export default CourseGroup;
