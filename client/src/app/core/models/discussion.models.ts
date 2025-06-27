// Représentation partielle des objets User et CourseUnit pour la clarté du modèle
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

// Interface pour un message individuel
export interface Message {
  _id: string;
  author: PartialUser;
  content: string;
  createdAt: string; // Les dates sont généralement transmises comme des chaînes ISO
}

// Interface pour une discussion complète
export interface Discussion {
  _id: string;
  title: string;
  author: PartialUser;
  course?: PartialCourseUnit;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// Interface pour la création d'une discussion
export interface CreateDiscussionRequest {
  title: string;
  message: string;
  course?: string; // ID du cours
}
