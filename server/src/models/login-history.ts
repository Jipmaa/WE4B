import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginHistory extends Document {
  userId: mongoose.Types.ObjectId;
  loginTime: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  logoutTime?: Date;
}

const LoginHistorySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  loginTime: { type: Date, default: Date.now, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  success: { type: Boolean, required: true },
  logoutTime: { type: Date },
});

LoginHistorySchema.index({ userId: 1, loginTime: -1 });

const LoginHistory = mongoose.model<ILoginHistory>('LoginHistory', LoginHistorySchema);

export default LoginHistory;
