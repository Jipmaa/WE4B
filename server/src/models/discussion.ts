import { Schema, model, Document } from 'mongoose';
import { IUser } from './user';
import { CourseUnit } from './course-unit';

export interface IMessage extends Document {
  author: IUser['_id'];
  content: string;
  createdAt: Date;
}

export interface IDiscussion extends Document {
  title: string;
  author: IUser['_id'];
  course?: CourseUnit['_id'];
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  author: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { 
    type: String, 
    required: true, 
    trim: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const discussionSchema = new Schema<IDiscussion>({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  author: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  course: { 
    type: Schema.Types.ObjectId, 
    ref: 'CourseUnit',
    required: false
  },
  messages: [messageSchema]
}, {
  timestamps: true
});

export const Discussion = model<IDiscussion>('Discussion', discussionSchema);
