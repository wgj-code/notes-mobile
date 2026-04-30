import type { ErrorCode } from '../types';

export function mapSupabaseError(error: any): ErrorCode {
  const msg = error?.message?.toLowerCase() ?? '';
  const status = error?.status ?? error?.code ?? 0;

  if (status === 401 || msg.includes('unauthorized')) return 'UNAUTHORIZED';
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) return 'AUTH_INVALID_CREDENTIALS';
  if (msg.includes('already registered') || msg.includes('already exists')) return 'AUTH_EMAIL_EXISTS';
  if (status === 404 || msg.includes('not found')) return 'NOTE_NOT_FOUND';
  if (msg.includes('title') && msg.includes('empty')) return 'NOTE_TITLE_EMPTY';
  if (msg.includes('title') && (msg.includes('too long') || msg.includes('200'))) return 'NOTE_TITLE_TOO_LONG';
  if (msg.includes('content') && msg.includes('too large')) return 'NOTE_CONTENT_TOO_LARGE';
  if (msg.includes('network') || msg.includes('fetch')) return 'NETWORK_ERROR';
  return 'UNKNOWN';
}

const messages: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'Session expired, please login again',
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
  AUTH_EMAIL_EXISTS: 'This email is already registered',
  NOTE_NOT_FOUND: 'Note not found',
  NOTE_TITLE_EMPTY: 'Title cannot be empty',
  NOTE_TITLE_TOO_LONG: 'Title must be under 200 characters',
  NOTE_CONTENT_TOO_LARGE: 'Content must be under 100KB',
  NETWORK_ERROR: 'Network error, please try again',
  UNKNOWN: 'Something went wrong',
};

export function getUserMessage(code: ErrorCode): string {
  return messages[code] ?? messages.UNKNOWN;
}
