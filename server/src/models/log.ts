
import mongoose, { Document, Schema } from 'mongoose';

export interface ILog extends Document {
  timestamp: Date;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

const LogSchema: Schema = new Schema({
  timestamp: { type: Date, default: Date.now, required: true },
  level: { type: String, required: true, enum: ['info', 'warn', 'error', 'debug'] },
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
});

const Log = mongoose.model<ILog>('Log', LogSchema);

export default Log;
