export interface Note {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_EMAIL_EXISTS'
  | 'NOTE_NOT_FOUND'
  | 'NOTE_TITLE_EMPTY'
  | 'NOTE_TITLE_TOO_LONG'
  | 'NOTE_CONTENT_TOO_LARGE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';
