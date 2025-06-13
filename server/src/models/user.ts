import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
	_id: mongoose.Types.ObjectId;
	birthdate: Date;
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	avatar?: string;
	roles: Array<'student' | 'teacher' | 'admin'>;
	department?: string;
	isActive: boolean;
	isEmailVerified: boolean;
	lastLogin?: Date;
	createdAt: Date;
	updatedAt: Date;
	comparePassword(candidatePassword: string): Promise<boolean>;
	getFullName(): string;
	hasRole(role: 'student' | 'teacher' | 'admin'): boolean;
	isAdmin(): boolean;
	isTeacher(): boolean;
}

const userSchema = new Schema<IUser>({
	birthdate: {
		type: Date,
		required: [true, 'Birthdate is required']
	},
	email: {
		type: String,
		required: [true, 'Email is required'],
		unique: true,
		lowercase: true,
		trim: true,
		match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
	},
	password: {
		type: String,
		required: [true, 'Password is required'],
		minlength: [6, 'Password must be at least 6 characters long'],
		select: false // Don't include password in queries by default
	},
	firstName: {
		type: String,
		required: [true, 'First name is required'],
		trim: true,
		maxlength: [50, 'First name must be less than 50 characters']
	},
	lastName: {
		type: String,
		required: [true, 'Last name is required'],
		trim: true,
		maxlength: [50, 'Last name must be less than 50 characters']
	},
	avatar: {
		type: String,
		default: null
	},
	roles: {
		type: [String],
		enum: ['student', 'teacher', 'admin'],
		default: ['student'],
		validate: {
			validator: function(roles: string[]) {
				return roles.length > 0;
			},
			message: 'User must have at least one role'
		}
	},
	department: {
		type: String,
		trim: true,
		maxlength: [100, 'Department must be less than 100 characters']
	},
	isActive: {
		type: Boolean,
		default: true
	},
	isEmailVerified: {
		type: Boolean,
		default: false
	},
	lastLogin: {
		type: Date,
		default: null
	}
}, {
	timestamps: true,
	toJSON: {
		transform: function(doc, ret) {
			delete ret.password;
			delete ret.__v;
			return ret;
		}
	},
	toObject: {
		transform: function(doc, ret) {
			delete ret.password;
			delete ret.__v;
			return ret;
		}
	}
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ roles: 1 });
userSchema.index({ department: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
	// Only run this function if password was actually modified
	if (!this.isModified('password')) return next();

	try {
		// Hash the password with cost of 12
		const salt = await bcrypt.genSalt(12);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		next(error as Error);
	}
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
	try {
		return await bcrypt.compare(candidatePassword, this.password);
	} catch (error) {
		throw new Error('Password comparison failed');
	}
};

// Instance method to get full name
userSchema.methods.getFullName = function(): string {
		return `${this.firstName} ${this.lastName}`;
};

// Instance method to check if user has a specific role
userSchema.methods.hasRole = function(role: 'student' | 'teacher' | 'admin'): boolean {
	return this.roles.includes(role);
};

// Instance method to check if user is admin
userSchema.methods.isAdmin = function(): boolean {
	return this.roles.includes('admin');
};

// Instance method to check if user is teacher
userSchema.methods.isTeacher = function(): boolean {
	return this.roles.includes('teacher');
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email: string) {
	return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
	const stats = await this.aggregate([
		{
			$group: {
				_id: null,
				totalUsers: { $sum: 1 },
				activeUsers: {
					$sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
				},
				verifiedUsers: {
					$sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
				},
				adminUsers: {
					$sum: { $cond: [{ $in: ['admin', '$roles'] }, 1, 0] }
				},
				teacherUsers: {
					$sum: { $cond: [{ $in: ['teacher', '$roles'] }, 1, 0] }
				},
				studentUsers: {
					$sum: { $cond: [{ $in: ['student', '$roles'] }, 1, 0] }
				}
			}
		}
	]);

	return stats[0] || {
		totalUsers: 0,
		activeUsers: 0,
		verifiedUsers: 0,
		adminUsers: 0,
		teacherUsers: 0,
		studentUsers: 0
	};
};

// Virtual for user's full name
userSchema.virtual('fullName').get(function() {
	return this.getFullName();
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model<IUser>('User', userSchema);

export default User;