/**
 * notesStore.test.ts — Unit tests for the notes Zustand store.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock supabase before any imports
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { useNotesStore } from '../stores/notesStore';
import { supabase } from '../lib/supabase';

const mockNote = {
  id: 'n1',
  title: 'Test',
  content: 'Body',
  user_id: 'u1',
  created_at: '2026-05-01',
  updated_at: '2026-05-06',
  deleted_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useNotesStore.setState({ notes: [], loading: false, error: null });
});

function makeQuery(overrides: Record<string, any> = {}) {
  return {
    select: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
}

describe('notesStore', () => {
  describe('fetchNotes', () => {
    it('loads notes into state', async () => {
      const q = makeQuery({
        order: jest.fn().mockResolvedValue({ data: [mockNote], error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useNotesStore.getState().fetchNotes();
      expect(useNotesStore.getState().notes).toEqual([mockNote]);
      expect(useNotesStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      const q = makeQuery({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useNotesStore.getState().fetchNotes();
      expect(useNotesStore.getState().error).toBe('fail');
      expect(useNotesStore.getState().loading).toBe(false);
    });

    it('filters deleted notes', async () => {
      const q = makeQuery({
        order: jest.fn().mockResolvedValue({ data: [mockNote], error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useNotesStore.getState().fetchNotes();
      expect(q.is).toHaveBeenCalledWith('deleted_at', null);
    });
  });

  describe('createNote', () => {
    it('adds new note to state', async () => {
      const q = makeQuery({
        single: jest.fn().mockResolvedValue({ data: mockNote, error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useNotesStore.getState().createNote('Test', 'Body');
      expect(useNotesStore.getState().notes).toContainEqual(mockNote);
    });

    it('throws on failure', async () => {
      const q = makeQuery({
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await expect(useNotesStore.getState().createNote('T', 'C')).rejects.toBeDefined();
    });
  });

  describe('updateNote', () => {
    it('updates note in state', async () => {
      useNotesStore.setState({ notes: [mockNote] });
      const q = makeQuery();
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useNotesStore.getState().updateNote('n1', 'Updated', 'New');
      expect(useNotesStore.getState().notes[0].title).toBe('Updated');
    });

    it('throws on failure', async () => {
      const q = makeQuery({
        eq: jest.fn().mockResolvedValue({ error: { message: 'fail' } }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await expect(useNotesStore.getState().updateNote('n1', 'T', 'C')).rejects.toBeDefined();
    });

    it('does not change other notes', async () => {
      const note2 = { ...mockNote, id: 'n2', title: 'Other' };
      useNotesStore.setState({ notes: [mockNote, note2] });
      const q = makeQuery();
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useNotesStore.getState().updateNote('n1', 'Changed', 'B');
      expect(useNotesStore.getState().notes[1].title).toBe('Other');
    });
  });

  describe('deleteNote', () => {
    it('removes note from state', async () => {
      useNotesStore.setState({ notes: [mockNote] });
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await useNotesStore.getState().deleteNote('n1');
      expect(useNotesStore.getState().notes).toHaveLength(0);
    });

    it('throws on failure', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: { message: 'fail' } });

      await expect(useNotesStore.getState().deleteNote('n1')).rejects.toBeDefined();
    });

    it('preserves other notes', async () => {
      const note2 = { ...mockNote, id: 'n2', title: 'Keep' };
      useNotesStore.setState({ notes: [mockNote, note2] });
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await useNotesStore.getState().deleteNote('n1');
      expect(useNotesStore.getState().notes).toHaveLength(1);
      expect(useNotesStore.getState().notes[0].id).toBe('n2');
    });
  });
});
