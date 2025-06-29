export interface PartialUser {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface PartialCourseUnit {
  _id: string;
  name: string;
  code: string;
}

export interface Message {
  _id: string;
  author: PartialUser;
  content: string;
  createdAt: string; // ISO string
}

export interface Discussion {
  _id: string;
  title: string;
  author: PartialUser;
  course?: PartialCourseUnit;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
