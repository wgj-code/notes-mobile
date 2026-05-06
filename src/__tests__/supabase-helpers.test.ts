/**
 * supabase-helpers.test.ts — Unit tests for mapSupabaseError and getUserMessage.
 *
 * Tests error mapping logic for all ErrorCode variants.
 */
import { describe, it, expect, jest } from '@jest/globals';

// ── Mock i18n module ──────────────────────────────────────────────────────
jest.mock('../i18n', () => ({
  t: (key: string) => key, // identity: returns the key itself
  getLanguage: jest.fn(() => 'en'),
  setLanguage: jest.fn(),
}));

import { mapSupabaseError, getUserMessage } from '../lib/supabase-helpers';

describe('mapSupabaseError', () => {
  it('maps 401 status to UNAUTHORIZED', () => {
    expect(mapSupabaseError({ status: 401 })).toBe('UNAUTHORIZED');
  });

  it('maps "unauthorized" message to UNAUTHORIZED', () => {
    expect(mapSupabaseError({ message: 'Unauthorized access' })).toBe('UNAUTHORIZED');
  });

  it('maps "invalid login" to AUTH_INVALID_CREDENTIALS', () => {
    expect(mapSupabaseError({ message: 'Invalid login credentials' })).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('maps "invalid credentials" to AUTH_INVALID_CREDENTIALS', () => {
    expect(mapSupabaseError({ message: 'invalid credentials provided' })).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('maps "already registered" to AUTH_EMAIL_EXISTS', () => {
    expect(mapSupabaseError({ message: 'User already registered' })).toBe('AUTH_EMAIL_EXISTS');
  });

  it('maps "already exists" to AUTH_EMAIL_EXISTS', () => {
    expect(mapSupabaseError({ message: 'Email already exists' })).toBe('AUTH_EMAIL_EXISTS');
  });

  it('maps 404 status to NOTE_NOT_FOUND', () => {
    expect(mapSupabaseError({ status: 404 })).toBe('NOTE_NOT_FOUND');
  });

  it('maps "not found" message to NOTE_NOT_FOUND', () => {
    expect(mapSupabaseError({ message: 'Note not found' })).toBe('NOTE_NOT_FOUND');
  });

  it('maps "title" + "empty" to NOTE_TITLE_EMPTY', () => {
    expect(mapSupabaseError({ message: 'title must not be empty' })).toBe('NOTE_TITLE_EMPTY');
  });

  it('maps "title" + "too long" to NOTE_TITLE_TOO_LONG', () => {
    expect(mapSupabaseError({ message: 'title is too long' })).toBe('NOTE_TITLE_TOO_LONG');
  });

  it('maps "title" + "200" to NOTE_TITLE_TOO_LONG', () => {
    expect(mapSupabaseError({ message: 'title exceeds 200 characters' })).toBe('NOTE_TITLE_TOO_LONG');
  });

  it('maps "content" + "too large" to NOTE_CONTENT_TOO_LARGE', () => {
    expect(mapSupabaseError({ message: 'content too large' })).toBe('NOTE_CONTENT_TOO_LARGE');
  });

  it('maps "network" to NETWORK_ERROR', () => {
    expect(mapSupabaseError({ message: 'Network request failed' })).toBe('NETWORK_ERROR');
  });

  it('maps "fetch" to NETWORK_ERROR', () => {
    expect(mapSupabaseError({ message: 'fetch failed' })).toBe('NETWORK_ERROR');
  });

  it('maps unknown error to UNKNOWN', () => {
    expect(mapSupabaseError({ message: 'something weird' })).toBe('UNKNOWN');
  });

  it('handles null/undefined error gracefully', () => {
    expect(mapSupabaseError(null)).toBe('UNKNOWN');
    expect(mapSupabaseError(undefined)).toBe('UNKNOWN');
  });

  it('uses code property as fallback for status', () => {
    expect(mapSupabaseError({ code: 401 })).toBe('UNAUTHORIZED');
  });
});

describe('getUserMessage', () => {
  it('returns i18n key for each error code', () => {
    expect(getUserMessage('UNAUTHORIZED')).toBe('errors.sessionExpired');
    expect(getUserMessage('AUTH_INVALID_CREDENTIALS')).toBe('errors.invalidCredentials');
    expect(getUserMessage('AUTH_EMAIL_EXISTS')).toBe('errors.emailExists');
    expect(getUserMessage('NOTE_NOT_FOUND')).toBe('errors.noteNotFound');
    expect(getUserMessage('NOTE_TITLE_EMPTY')).toBe('errors.titleEmpty');
    expect(getUserMessage('NOTE_TITLE_TOO_LONG')).toBe('errors.titleTooLong');
    expect(getUserMessage('NOTE_CONTENT_TOO_LARGE')).toBe('errors.contentTooLarge');
    expect(getUserMessage('NETWORK_ERROR')).toBe('errors.network');
    expect(getUserMessage('UNKNOWN')).toBe('errors.unknown');
  });
});
