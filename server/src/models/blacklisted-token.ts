import mongoose, { Document, Schema } from 'mongoose';

export interface BlacklistedToken extends Document {
	_id: mongoose.Types.ObjectId;
	token: string;
	userId: mongoose.Types.ObjectId;
	blacklistedAt: Date;
	expiresAt: Date;
}

const blacklistedTokenSchema = new Schema<BlacklistedToken>({
	token: {
		type: String,
		required: true,
		unique: true,
		index: true
	},
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		index: true
	},
	blacklistedAt: {
		type: Date,
		default: Date.now,
		index: true
	},
	expiresAt: {
		type: Date,
		required: true,
		index: { expireAfterSeconds: 0 } // MongoDB TTL index to automatically remove expired tokens
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

// Index for efficient token lookup
blacklistedTokenSchema.index({ token: 1, expiresAt: 1 });

// Static method to check if a token is blacklisted
blacklistedTokenSchema.statics.isTokenBlacklisted = async function(token: string): Promise<boolean> {
	const blacklistedToken = await this.findOne({ 
		token, 
		expiresAt: { $gt: new Date() } 
	});
	return !!blacklistedToken;
};

// Static method to blacklist a token
blacklistedTokenSchema.statics.blacklistToken = async function(token: string, userId: string, expiresAt: Date): Promise<void> {
	try {
		await this.create({
			token,
			userId,
			expiresAt
		});
	} catch (error: any) {
		// Ignore duplicate key errors (token already blacklisted)
		if (error.code !== 11000) {
			throw error;
		}
	}
};

// Static method to clean up expired tokens (optional, as TTL index handles this automatically)
blacklistedTokenSchema.statics.cleanupExpiredTokens = async function(): Promise<number> {
	const result = await this.deleteMany({ 
		expiresAt: { $lt: new Date() } 
	});
	return result.deletedCount || 0;
};

const BlacklistedToken = mongoose.model<BlacklistedToken>('BlacklistedToken', blacklistedTokenSchema);

export default BlacklistedToken;