export interface Note {
  id: string;
  title: string;
  content: string;
  user_id: string;
  folder_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'other';

export type FeedbackStatus = 'new' | 'reviewed' | 'resolved' | 'wontfix';

export interface Feedback {
  id: string;
  user_id: string;
  content: string;
  voice_url: string | null;
  images: string[];
  category: FeedbackCategory;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  title: string;
  content: string;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_EMAIL_EXISTS'
  | 'NOTE_NOT_FOUND'
  | 'NOTE_TITLE_EMPTY'
  | 'NOTE_TITLE_TOO_LONG'
  | 'NOTE_CONTENT_TOO_LARGE'
  | 'FOLDER_NOT_FOUND'
  | 'FOLDER_NAME_EMPTY'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';
