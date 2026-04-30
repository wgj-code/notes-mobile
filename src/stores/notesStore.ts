import { create } from 'zustand';
import type { Note } from '../types';
import { supabase } from '../lib/supabase';

interface NotesState {
  notes: Note[];
  loading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  createNote: (title: string, content: string) => Promise<void>;
  updateNote: (id: string, title: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,
  error: null,

  fetchNotes: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set({ notes: data as Note[], loading: false });
  },

  createNote: async (title, content) => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ title, content })
      .select()
      .single();
    if (error) throw error;
    set({ notes: [data as Note, ...get().notes] });
  },

  updateNote: async (id, title, content) => {
    const { error } = await supabase
      .from('notes')
      .update({ title, content })
      .eq('id', id);
    if (error) throw error;
    set({
      notes: get().notes.map((n) =>
        n.id === id ? { ...n, title, content, updated_at: new Date().toISOString() } : n
      ),
    });
  },

  deleteNote: async (id) => {
    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },
}));
