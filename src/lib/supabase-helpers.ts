import type { ErrorCode } from '../types';
import { t } from '../i18n';

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

const ERROR_KEY_MAP: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'errors.sessionExpired',
  AUTH_INVALID_CREDENTIALS: 'errors.invalidCredentials',
  AUTH_EMAIL_EXISTS: 'errors.emailExists',
  NOTE_NOT_FOUND: 'errors.noteNotFound',
  NOTE_TITLE_EMPTY: 'errors.titleEmpty',
  NOTE_TITLE_TOO_LONG: 'errors.titleTooLong',
  NOTE_CONTENT_TOO_LARGE: 'errors.contentTooLarge',
  FOLDER_NOT_FOUND: 'errors.unknown',
  FOLDER_NAME_EMPTY: 'errors.titleEmpty',
  NETWORK_ERROR: 'errors.network',
  UNKNOWN: 'errors.unknown',
};

export function getUserMessage(code: ErrorCode): string {
  const key = ERROR_KEY_MAP[code] ?? ERROR_KEY_MAP.UNKNOWN;
  return t(key);
}
