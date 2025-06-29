import mongoose, { Document, Schema, Types } from 'mongoose';

export type RecentActivityAction = 'create' | 'update' | 'submit' | 'grade' | 'add_to_course' | 'due_soon' | 'overdue';

export interface ActivityActor {
	kind: 'user' | 'system';
	data: Types.ObjectId | string;
}

export interface IRecentActivity extends Document {
	_id: Types.ObjectId;
	actor: ActivityActor;
	date: Date;
	course: Types.ObjectId;
	activity?: Types.ObjectId;
	action: RecentActivityAction;
	targetUser?: Types.ObjectId;
	metadata?: {
		filesCount?: number;
		grade?: number;
		completionPercentage?: number;
		overduePeriod?: string;
		overdueStudentCount?: number;
		overdueStudentNames?: string[];
	};
	createdAt: Date;
	updatedAt: Date;
}

const actorSchema = new Schema<ActivityActor>({
	kind: {
		type: String,
		enum: ['user', 'system'],
		required: true
	},
	data: {
		type: Schema.Types.Mixed,
		required: true,
		validate: {
			validator: function(value: any) {
				if (this.kind === 'user') {
					return mongoose.Types.ObjectId.isValid(value);
				}
				return typeof value === 'string';
			},
			message: 'Actor data must be ObjectId for user or string for system'
		}
	}
}, { _id: false });

const recentActivitySchema = new Schema<IRecentActivity>({
	actor: {
		type: actorSchema,
		required: true
	},
	date: {
		type: Date,
		required: true,
		default: Date.now
	},
	course: {
		type: Schema.Types.ObjectId,
		ref: 'CourseUnit',
		required: true
	},
	activity: {
		type: Schema.Types.ObjectId,
		ref: 'CourseActivity',
		required: false
	},
	action: {
		type: String,
		enum: ['create', 'update', 'submit', 'grade', 'add_to_course', 'due_soon', 'overdue'],
		required: true
	},
	targetUser: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: false
	},
	metadata: {
		filesCount: { type: Number },
		grade: { type: Number, min: 0, max: 20 },
		completionPercentage: { type: Number, min: 0, max: 100 },
		overduePeriod: { type: String },
		overdueStudentCount: { type: Number, min: 0 },
		overdueStudentNames: [{ type: String }]
	}
}, {
	timestamps: true,
	toJSON: {
		transform: function(doc, ret) {
			delete ret.__v;
			return ret;
		}
	},
	toObject: {
		transform: function(doc, ret) {
			delete ret.__v;
			return ret;
		}
	}
});

// Indexes for better performance
recentActivitySchema.index({ date: -1 });
recentActivitySchema.index({ course: 1, date: -1 });
recentActivitySchema.index({ 'actor.data': 1, date: -1 });
recentActivitySchema.index({ targetUser: 1, date: -1 });
recentActivitySchema.index({ action: 1, date: -1 });

// Note: Population is handled in routes to avoid TypeScript issues

// Static method to create activity log
recentActivitySchema.statics.logActivity = async function(activityData: Partial<IRecentActivity>) {
	try {
		const activity = new this(activityData);
		await activity.save();
		return activity;
	} catch (error) {
		console.error('Failed to log activity:', error);
		throw error;
	}
};

// Static method to get recent activities for a user
recentActivitySchema.statics.getRecentActivitiesForUser = async function(userId: string, options: {
	page?: number;
	limit?: number;
	courseId?: string;
	action?: RecentActivityAction;
} = {}) {
	const { page = 1, limit = 20, courseId, action } = options;
	const skip = (page - 1) * limit;

	// Build query based on filters
	const query: any = {};
	
	if (courseId) {
		query.course = courseId;
	}
	
	if (action) {
		query.action = action;
	}

	// Find activities and populate references
	const activities = await this.find(query)
		.sort({ date: -1 })
		.skip(skip)
		.limit(limit)
		.lean();

	const total = await this.countDocuments(query);

	return {
		activities,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit)
		}
	};
};

const RecentActivity = mongoose.model<IRecentActivity>('RecentActivity', recentActivitySchema);

export default RecentActivity;