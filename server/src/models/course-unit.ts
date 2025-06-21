import mongoose, { Document, Schema } from 'mongoose';

export enum CourseUnitType {
	CS = 'CS',
	TM = 'TM',
	EC = 'EC',
	QC = 'QC',
	OM = 'OM'
}

export interface CourseUnit extends Document {
	_id: mongoose.Types.ObjectId;
	slug: string;
	capacity: number;
	name: string;
	code: string;
	type: CourseUnitType;
	img_path?: string;
	createdAt: Date;
	updatedAt: Date;
}

const courseUnitSchema = new Schema<CourseUnit>({
	slug: {
		type: String,
		unique: true,
		required: true
	},
	capacity: {
		type: Number,
		required: true
	},
	name: {
		type: String,
		required: true,
		trim: true,
		maxlength: [50, 'Name must be less than 50 characters']
	},
	code: {
		type: String,
		required: true
		// TODO: add more validation
	},
	type: {
		type: String,
		enum: Object.values(CourseUnitType),
		required: true
	},
	img_path: {
		type: String,
		default: null
	}
}, {
	timestamps: true,
	toJSON: {
		transform: function (doc, ret) {
			delete ret.__v;
			return ret;
		}
	},
	toObject: {
		transform: function (doc, ret) {
			delete ret.__v;
			return ret;
		}
	}
});

courseUnitSchema.index({ slug: 1 });

const CourseUnit = mongoose.model<CourseUnit>('CourseUnit', courseUnitSchema);

export default CourseUnit;