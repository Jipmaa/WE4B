import Log, { ILog } from '../models/log';
import mongoose from 'mongoose';

interface LogOptions {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  userId?: mongoose.Types.ObjectId | string;
  metadata?: Record<string, any>;
}

export const logActivity = async ({ level, message, userId, metadata }: LogOptions): Promise<ILog> => {
  const logEntry = new Log({
    timestamp: new Date(),
    level,
    message,
    metadata: {
      ...metadata,
      userId: userId ? userId.toString() : undefined, // Store userId in metadata if provided
    },
  });

  await logEntry.save();
  return logEntry;
};
