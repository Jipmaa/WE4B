import mongoose, { Document, Schema } from 'mongoose';

interface CourseUnitActivitiesCategory {
	_id: mongoose.Types.ObjectId;
	name: string;
	description: string;
	activities: mongoose.Types.ObjectId[];
}

export interface CourseUnit extends Document {
	_id: mongoose.Types.ObjectId;
	slug: string;
	capacity: number;
	name: string;
	code: string;
	img?: string;  // MinIO object key
	groups?: mongoose.Types.ObjectId[];
	activities: CourseUnitActivitiesCategory[];
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
	img: {
		type: String,
		default: null
	},
	groups: {
		type: [{
			type: Schema.Types.ObjectId,
			ref: 'CourseGroup'
		}],
		default: [],
		select: false
	},
	activities: {
		type: [{
			name: {
				type: String,
				required: true,
				trim: true,
				maxlength: [50, 'Name must be less than 50 characters']
			},
			description: {
				type: String,
				required: true,
				trim: true,
				maxlength: [100, 'Description must be less than 100 characters']
			},
			activities: {
				type: [{
					type: Schema.Types.ObjectId,
					ref: 'CourseActivity'
				}],
				select: false,
				default: []
			}
		}],
		default: []
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

courseUnitSchema.index({ slug: 1 });
courseUnitSchema.index({ groups: 1 });

const CourseUnit = mongoose.model<CourseUnit>('CourseUnit', courseUnitSchema);

export default CourseUnit;
