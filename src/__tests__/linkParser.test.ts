/**
 * linkParser.test.ts — Unit tests for wiki-link processing and note link utilities.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the notesStore dependency (only used by findNoteIdByTitle)
jest.mock('@/stores/notesStore', () => ({
  useNotesStore: {
    getState: jest.fn(() => ({ notes: [] })),
  },
}));

import {
  processWikiLinks,
  extractNoteTitleFromLink,
  isNoteLink,
  NOTELINK_SCHEME,
} from '../lib/markdown/linkParser';

describe('linkParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processWikiLinks()', () => {
    it('converts a single wikilink to a notelink', () => {
      const result = processWikiLinks('See [[My Note]] for details.');
      expect(result).toBe('See [My Note](notelink://My Note) for details.');
    });

    it('converts multiple wikilinks in one string', () => {
      const result = processWikiLinks('[[Note A]] and [[Note B]]');
      expect(result).toBe('[Note A](notelink://Note A) and [Note B](notelink://Note B)');
    });

    it('does not convert empty title wikilinks', () => {
      const result = processWikiLinks('See [[]] here');
      expect(result).toBe('See [[]] here');
    });

    it('trims whitespace in wikilink titles', () => {
      const result = processWikiLinks('[[  Trimmed Title  ]]');
      expect(result).toBe('[Trimmed Title](notelink://Trimmed Title)');
    });

    it('returns content unchanged when no wikilinks exist', () => {
      const input = 'Just regular markdown text with **bold**.';
      const result = processWikiLinks(input);
      expect(result).toBe(input);
    });

    it('leaves non-wikilink markdown links untouched', () => {
      const input = '[Normal Link](https://example.com)';
      const result = processWikiLinks(input);
      expect(result).toBe(input);
    });

    it('handles wikilink with special characters in title', () => {
      const result = processWikiLinks('[[Note: v2.0 (draft)]]');
      expect(result).toBe('[Note: v2.0 (draft)](notelink://Note: v2.0 (draft))');
    });
  });

  describe('extractNoteTitleFromLink()', () => {
    it('extracts title from a valid notelink URL', () => {
      const result = extractNoteTitleFromLink('notelink://My Note');
      expect(result).toBe('My Note');
    });

    it('returns null for non-notelink URLs', () => {
      expect(extractNoteTitleFromLink('https://example.com')).toBeNull();
      expect(extractNoteTitleFromLink('http://localhost:3000')).toBeNull();
      expect(extractNoteTitleFromLink('')).toBeNull();
    });

    it('handles URL-encoded titles', () => {
      const result = extractNoteTitleFromLink('notelink://Note%20Title');
      expect(result).toBe('Note Title');
    });

    it('extracts title from notelink with special characters', () => {
      const result = extractNoteTitleFromLink('notelink://Note%3A%20v2.0');
      expect(result).toBe('Note: v2.0');
    });
  });

  describe('isNoteLink()', () => {
    it('returns true for notelink:// URLs', () => {
      expect(isNoteLink('notelink://Some Note')).toBe(true);
      expect(isNoteLink('notelink://')).toBe(true);
    });

    it('returns false for other URLs', () => {
      expect(isNoteLink('https://example.com')).toBe(false);
      expect(isNoteLink('http://localhost')).toBe(false);
      expect(isNoteLink('')).toBe(false);
      expect(isNoteLink('note-link://Something')).toBe(false);
    });
  });
});
