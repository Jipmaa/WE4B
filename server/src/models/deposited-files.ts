import mongoose, { Document, Schema, Types } from 'mongoose';
import { getPresignedUrl, FILE_CONFIGS } from '../services/minio-service';

// Interface for the DepositedFiles document
export interface DepositedFiles extends Document {
	_id: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
	activity: Types.ObjectId;
	user: Types.ObjectId;
	files: string[]; // MinIO object keys
	courseUnit: Types.ObjectId;
	courseActivity: Types.ObjectId;
	evaluation?: {
		grade?: number;
		comment?: string;
		gradedBy?: Types.ObjectId;
		gradedAt?: Date;
	};
	getFileUrls(): Promise<string[]>;
}

// Mongoose Schema for DepositedFiles
const depositedFilesSchema = new Schema<DepositedFiles>({
	activity: {
		type: Schema.Types.ObjectId,
		ref: 'CourseActivity',
		required: [true, 'Activity reference is required.'],
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: [true, 'User reference is required.'],
	},
	courseUnit: {
		type: Schema.Types.ObjectId,
		ref: 'CourseUnit',
		required: [true, 'Course unit reference is required.'],
	},
	courseActivity: {
		type: Schema.Types.ObjectId,
		ref: 'CourseActivity',
		required: [true, 'Course activity reference is required.'],
	},
	files: {
		type: [String],
		required: [true, 'At least one file is required.'],
		validate: {
			validator: (v: string | any[]) => v.length > 0,
			message: 'Files array cannot be empty.'
		}
	},
	evaluation: {
		grade: { type: Number, min: 0, max: 20 },
		comment: { type: String, maxlength: 1000 },
		gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
		gradedAt: { type: Date }
	},
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

// --- Instance Methods ---
depositedFilesSchema.methods.getFileUrls = async function(this: DepositedFiles): Promise<string[]> {
	if (!this.files || this.files.length === 0) return [];
	
	try {
		const urls = await Promise.all(
			this.files.map(fileKey => 
				getPresignedUrl(FILE_CONFIGS.depositedFile.bucket, fileKey)
			)
		);
		return urls;
	} catch (error) {
		console.warn('Failed to generate file URLs:', error);
		return [];
	}
};

// --- Indexes ---
// Unique index to ensure a user can only submit once per activity
depositedFilesSchema.index({ activity: 1, user: 1 }, { unique: true });
depositedFilesSchema.index({ user: 1 });

// --- Model ---
const DepositedFiles = mongoose.model<DepositedFiles>('DepositedFiles', depositedFilesSchema);

export default DepositedFiles;
