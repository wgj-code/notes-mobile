/**
 * templateStore.test.ts -- Unit tests for the template Zustand store.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock supabase before any imports
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

import { useTemplateStore, processTemplateContent } from '../stores/templateStore';
import { supabase } from '../lib/supabase';

const mockTemplate = {
  id: 't1',
  user_id: 'u1',
  name: 'Daily Note',
  title: 'Daily Note',
  content: '{{date}} Daily Note',
  is_builtin: false,
  created_at: '2026-05-18T00:00:00Z',
  updated_at: '2026-05-18T00:00:00Z',
};

const mockBuiltin = {
  id: 't2',
  user_id: 'system',
  name: 'Built-in',
  title: 'Built-in Template',
  content: 'Built-in content',
  is_builtin: true,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
};

/**
 * Build a self-chaining query mock where every method returns `this`.
 * Override the terminal method (e.g. `order`, `single`) to inject data.
 */
function makeQuery(overrides: Record<string, any> = {}) {
  const q: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return q;
}

beforeEach(() => {
  jest.clearAllMocks();
  useTemplateStore.setState({ templates: [], loading: false, error: null });
});

describe('templateStore', () => {
  describe('initial state', () => {
    it('starts with empty templates', () => {
      expect(useTemplateStore.getState().templates).toEqual([]);
      expect(useTemplateStore.getState().loading).toBe(false);
      expect(useTemplateStore.getState().error).toBeNull();
    });
  });

  describe('fetchTemplates', () => {
    it('loads templates from supabase', async () => {
      // Store chain: from().select('*').order().order()
      // First order() must return q for chaining, second resolves with data
      const terminalResult = Promise.resolve({ data: [mockBuiltin, mockTemplate], error: null });
      const q: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      q.order = jest.fn()
        .mockReturnValueOnce(q)              // first .order() returns q for chaining
        .mockReturnValueOnce(terminalResult); // second .order() resolves with data

      (supabase.from as jest.Mock).mockReturnValue(q);

      await useTemplateStore.getState().fetchTemplates();

      expect(supabase.from).toHaveBeenCalledWith('templates');
      expect(q.select).toHaveBeenCalledWith('*');
      expect(useTemplateStore.getState().templates).toEqual([mockBuiltin, mockTemplate]);
      expect(useTemplateStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      const errorResult = Promise.resolve({ data: null, error: { message: 'load failed' } });
      const q: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      q.order = jest.fn()
        .mockReturnValueOnce(q)            // first .order() returns q
        .mockReturnValueOnce(errorResult); // second .order() resolves with error
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useTemplateStore.getState().fetchTemplates();

      expect(useTemplateStore.getState().error).toBe('load failed');
      expect(useTemplateStore.getState().loading).toBe(false);
    });

    it('handles network exception', async () => {
      const q = makeQuery();
      (q.select as jest.Mock).mockImplementation(() => {
        throw new Error('Network error');
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useTemplateStore.getState().fetchTemplates();

      expect(useTemplateStore.getState().error).toBe('Network error');
      expect(useTemplateStore.getState().loading).toBe(false);
    });
  });

  describe('createTemplate', () => {
    it('inserts new template and appends to list', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'u1' } },
      });
      const q = makeQuery({
        single: jest.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      const result = await useTemplateStore.getState().createTemplate(
        'Daily Note',
        'Daily Note',
        '{{date}} Daily Note'
      );

      expect(q.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Daily Note',
          title: 'Daily Note',
          content: '{{date}} Daily Note',
          user_id: 'u1',
          is_builtin: false,
        })
      );
      expect(result).toEqual(mockTemplate);
      expect(useTemplateStore.getState().templates).toEqual([mockTemplate]);
    });

    it('throws when user is not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      await expect(
        useTemplateStore.getState().createTemplate('T', 'T', 'C')
      ).rejects.toThrow('Not authenticated');
    });

    it('throws on insert error', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'u1' } },
      });
      const q = makeQuery({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'insert failed' },
        }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await expect(
        useTemplateStore.getState().createTemplate('T', 'T', 'C')
      ).rejects.toBeDefined();
    });
  });

  describe('deleteTemplate', () => {
    it('removes template from state by id', async () => {
      useTemplateStore.setState({ templates: [mockTemplate] });
      const q = makeQuery();
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useTemplateStore.getState().deleteTemplate('t1');

      expect(q.delete).toHaveBeenCalled();
      expect(q.eq).toHaveBeenCalledWith('id', 't1');
      expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('throws when trying to delete a built-in template', async () => {
      useTemplateStore.setState({ templates: [mockBuiltin] });

      await expect(
        useTemplateStore.getState().deleteTemplate('t2')
      ).rejects.toThrow('Cannot delete built-in templates');
    });

    it('preserves other templates after deletion', async () => {
      useTemplateStore.setState({ templates: [mockTemplate, mockBuiltin] });
      const q = makeQuery();
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useTemplateStore.getState().deleteTemplate('t1');

      expect(useTemplateStore.getState().templates).toHaveLength(1);
      expect(useTemplateStore.getState().templates[0].id).toBe('t2');
    });

    it('throws on delete error', async () => {
      useTemplateStore.setState({ templates: [mockTemplate] });
      const q = makeQuery();
      q.delete.mockResolvedValue({ error: { message: 'delete failed' } });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await expect(
        useTemplateStore.getState().deleteTemplate('t1')
      ).rejects.toBeDefined();
    });
  });
});

describe('processTemplateContent', () => {
  it('replaces {{date}} with current date', () => {
    const result = processTemplateContent('{{date}} - Meeting notes');
    expect(result).toContain('Meeting notes');
    expect(result).not.toContain('{{date}}');
  });

  it('replaces multiple {{date}} placeholders', () => {
    const result = processTemplateContent('{{date}} start {{date}} end');
    expect(result).not.toContain('{{date}}');
  });

  it('returns content unchanged when no placeholders', () => {
    expect(processTemplateContent('Hello world')).toBe('Hello world');
  });
});
