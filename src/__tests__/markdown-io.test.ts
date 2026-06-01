/**
 * markdown-io.test.ts — Unit tests for Markdown import/export content processing.
 *
 * Since there is no standalone markdown-io.ts module, these tests exercise
 * the core content processing logic inline: parsing headings, lists, code
 * blocks, content-length calculation, and special-character handling.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Helpers ───────────────────────────────────────────────────────────

/** Extract top-level headings from a markdown string. */
function extractHeadings(md: string): string[] {
  const headings: string[] = [];
  const lines = md.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push(match[2].trim());
    }
  }
  return headings;
}

/** Count list items (both `- ` and `1. ` prefixes). */
function countListItems(md: string): number {
  const lines = md.split('\n');
  let count = 0;
  for (const line of lines) {
    if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      count++;
    }
  }
  return count;
}

/** Check if the markdown contains a fenced code block. */
function hasCodeBlock(md: string): boolean {
  return /```[\s\S]*?```/.test(md);
}

/** Strip markdown syntax and return plain text length. */
function plainTextLength(md: string): number {
  return md
    .replace(/```[\s\S]*?```/g, '')  // code blocks
    .replace(/`[^`]+`/g, '')          // inline code
    .replace(/#{1,6}\s+/g, '')        // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')    // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/[-*+]\s/g, '')          // list markers
    .replace(/\n/g, '')               // newlines
    .length;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('Markdown content processing', () => {
  const sampleMarkdown = [
    '# Welcome to My Note',
    '',
    'This is a **bold** statement and this is *italic*.',
    '',
    '## Section One',
    '',
    '- Item one',
    '- Item two',
    '- Item three',
    '',
    '## Section Two',
    '',
    '```javascript',
    'const greeting = "Hello, World!";',
    'console.log(greeting);',
    '```',
    '',
    'A [link here](https://example.com) for reference.',
    '',
    '1. First step',
    '2. Second step',
    '3. Third step',
  ].join('\n');

  describe('extractHeadings()', () => {
    it('extracts all headings from markdown', () => {
      const headings = extractHeadings(sampleMarkdown);
      expect(headings).toEqual([
        'Welcome to My Note',
        'Section One',
        'Section Two',
      ]);
    });

    it('returns empty array for markdown without headings', () => {
      const headings = extractHeadings('Just some plain text.');
      expect(headings).toEqual([]);
    });

    it('handles headings with different levels', () => {
      const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
      const headings = extractHeadings(md);
      expect(headings).toEqual(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
    });
  });

  describe('countListItems()', () => {
    it('counts unordered list items', () => {
      expect(countListItems(sampleMarkdown)).toBe(6); // 3 unordered + 3 ordered
    });

    it('returns 0 for content without lists', () => {
      expect(countListItems('# Title\nJust text.')).toBe(0);
    });

    it('counts nested list items', () => {
      const md = '- Top\n  - Nested\n    - Deep nested';
      expect(countListItems(md)).toBe(3);
    });
  });

  describe('hasCodeBlock()', () => {
    it('detects fenced code blocks', () => {
      expect(hasCodeBlock(sampleMarkdown)).toBe(true);
    });

    it('returns false for markdown without code blocks', () => {
      expect(hasCodeBlock('# Title\nNo code here.')).toBe(false);
    });

    it('detects code blocks with various languages', () => {
      expect(hasCodeBlock('```python\nprint("hi")\n```')).toBe(true);
      expect(hasCodeBlock('```\nraw block\n```')).toBe(true);
    });
  });

  describe('plainTextLength()', () => {
    it('calculates content length excluding markdown syntax', () => {
      const len = plainTextLength(sampleMarkdown);
      expect(typeof len).toBe('number');
      expect(len).toBeGreaterThan(0);
      // Plain text should be shorter than raw markdown
      expect(len).toBeLessThan(sampleMarkdown.length);
    });

    it('returns 0 for empty content', () => {
      expect(plainTextLength('')).toBe(0);
    });

    it('returns same length for plain text (no syntax to strip)', () => {
      const plain = 'Hello World';
      expect(plainTextLength(plain)).toBe(plain.length);
    });
  });

  describe('Special character handling', () => {
    it('preserves Chinese characters in headings', () => {
      const md = '# 我的笔记标题';
      const headings = extractHeadings(md);
      expect(headings).toEqual(['我的笔记标题']);
    });

    it('preserves Chinese characters in list items', () => {
      const md = '- 第一项\n- 第二项';
      expect(countListItems(md)).toBe(2);
    });

    it('handles emoji in content', () => {
      const md = '# Title with emoji \u{1F680}';
      const headings = extractHeadings(md);
      expect(headings[0]).toContain('\u{1F680}');
    });

    it('handles empty lines and whitespace', () => {
      const md = '\n\n# Title\n\n\n';
      const headings = extractHeadings(md);
      expect(headings).toEqual(['Title']);
    });

    it('handles code blocks with special characters', () => {
      const md = '```\nconst x = <div class="test">&amp;</div>\n```';
      expect(hasCodeBlock(md)).toBe(true);
    });

    it('handles links with special characters', () => {
      const md = '[link (with parens)](https://example.com?a=1&b=2)';
      const len = plainTextLength(md);
      expect(len).toBeGreaterThan(0);
      // The stripped text should contain the link text
      expect(len).toBeLessThan(md.length);
    });
  });
});
