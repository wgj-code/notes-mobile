import { create } from 'zustand';
import type { Note, Folder } from '../types';
import { supabase } from '../lib/supabase';
import {
  upsertLocalNotes,
  getAllLocalNotes,
  upsertLocalNote,
  upsertLocalFolders,
  getAllLocalFolders,
  deleteLocalNote,
} from '../lib/database/queries';
import { syncNotes } from '../lib/database/sync';

interface NotesState {
  // Data
  notes: Note[];
  folders: Folder[];
  loading: boolean;
  error: string | null;

  // UI state
  selectedFolderId: string | null;
  searchQuery: string;
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'pending';

  // Computed
  filteredNotes: () => Note[];

  // Actions
  fetchNotes: () => Promise<void>;
  createNote: (title: string, content: string, folderId?: string | null, tags?: string[]) => Promise<void>;
  updateNote: (id: string, title: string, content: string, folderId?: string | null, tags?: string[]) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  // Recycle bin
  fetchDeletedNotes: () => Promise<void>;
  deletedNotes: Note[];
  restoreNote: (id: string) => Promise<void>;
  permanentDeleteNote: (id: string) => Promise<void>;

  // Sharing
  shareNote: (id: string) => Promise<void>;

  fetchFolders: () => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;

  setSearchQuery: (query: string) => void;
  setSelectedFolderId: (id: string | null) => void;
  setOnline: (online: boolean) => void;

  syncLocalToRemote: () => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  deletedNotes: [],
  folders: [],
  loading: false,
  error: null,

  selectedFolderId: null,
  searchQuery: '',
  isOnline: true,
  syncStatus: 'synced',

  filteredNotes: () => {
    const { notes, selectedFolderId, searchQuery } = get();
    let result = notes;

    // Filter by folder
    if (selectedFolderId !== null) {
      if (selectedFolderId === '__uncategorized') {
        result = result.filter((n) => !n.folder_id);
      } else {
        result = result.filter((n) => n.folder_id === selectedFolderId);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          stripMarkdown(n.content).toLowerCase().includes(q)
      );
    }

    return result;
  },

  fetchNotes: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        // Offline or network error: fall back to local SQLite cache
        const localNotes = getAllLocalNotes();
        if (localNotes.length > 0) {
          set({ notes: localNotes as Note[], loading: false, isOnline: false });
        } else {
          set({ error: error.message, loading: false });
        }
        return;
      }

      const notes = data as Note[];
      set({ notes, loading: false, isOnline: true });

      // Cache locally (fire and forget)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        upsertLocalNotes(notes.map((n) => ({ ...n, is_dirty: 0 }))).catch(() => {});
      }
    } catch (err: any) {
      // Network error: fall back to local cache
      const localNotes = getAllLocalNotes();
      if (localNotes.length > 0) {
        set({ notes: localNotes as Note[], loading: false, isOnline: false });
      } else {
        set({ error: err.message || 'Network error', loading: false });
      }
    }
  },

  createNote: async (title, content, folderId = null, tags = []) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({ title, content, folder_id: folderId, tags })
        .select()
        .single();
      if (error) throw error;
      set({ notes: [data as Note, ...get().notes] });
      return data as Note;
    } catch {
      // Offline: create locally with dirty flag
      const localNote: Note & { is_dirty: number } = {
        id: crypto.randomUUID(),
        title,
        content,
        user_id: '',
        folder_id: folderId,
        tags: tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        is_dirty: 1,
      };
      upsertLocalNote(localNote).catch(() => {});
      set({ notes: [localNote as Note, ...get().notes] });
      return localNote as Note;
    }
  },

  updateNote: async (id, title, content, folderId, tags) => {
    const updates: Record<string, any> = { title, content };
    if (folderId !== undefined) updates.folder_id = folderId;
    if (tags !== undefined) updates.tags = tags;

    try {
      const { error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    } catch {
      // Offline: update locally and mark dirty
      const note = get().notes.find((n) => n.id === id);
      if (note) {
        upsertLocalNote({ ...note, ...updates, is_dirty: 1 } as any).catch(() => {});
      }
    }

    set({
      notes: get().notes.map((n) =>
        n.id === id
          ? {
              ...n,
              title,
              content,
              ...(folderId !== undefined ? { folder_id: folderId } : {}),
              ...(tags !== undefined ? { tags } : {}),
              updated_at: new Date().toISOString(),
            }
          : n
      ),
    });
  },

  deleteNote: async (id) => {
    try {
      const { error } = await supabase.rpc('soft_delete_note', { p_note_id: id });
      if (error) throw error;
    } catch {
      // Offline: mark as deleted locally
      deleteLocalNote(id).catch(() => {});
    }
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  // ── Recycle Bin ────────────────────────────────────────────────────────

  fetchDeletedNotes: async () => {
    try {
      const { data, error } = await supabase.rpc('fetch_deleted_notes');
      if (error) throw error;
      set({ deletedNotes: (data ?? []) as Note[] });
    } catch {
      set({ deletedNotes: [] });
    }
  },

  restoreNote: async (id) => {
    try {
      const { error } = await supabase.rpc('restore_note', { p_note_id: id });
      if (error) throw error;
      // Refresh notes list to show restored note
      get().fetchNotes();
      set({
        deletedNotes: get().deletedNotes.filter((n) => n.id !== id),
      });
    } catch {
      // ignore
    }
  },

  permanentDeleteNote: async (id) => {
    try {
      const { error } = await supabase.rpc('permanent_delete_note', { p_note_id: id });
      if (error) throw error;
    } catch {
      deleteLocalNote(id).catch(() => {});
    }
    set({
      deletedNotes: get().deletedNotes.filter((n) => n.id !== id),
    });
  },

  // ── Sharing ────────────────────────────────────────────────────────────

  shareNote: async (id) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ shared: true })
        .eq('id', id);
      if (error) throw error;
    } catch {
      // ignore - sharing is optional
    }
    set({
      notes: get().notes.map((n) =>
        n.id === id ? { ...n, shared: true } : n
      ),
    });
  },

  // ── Folders ──────────────────────────────────────────────────────────

  fetchFolders: async () => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('name', { ascending: true });

    if (error) return;
    const folders = (data ?? []) as Folder[];
    set({ folders });

    // Cache locally
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      upsertLocalFolders(folders.map((f) => ({ ...f, is_dirty: 0 }))).catch(() => {});
    }
  },

  createFolder: async (name, parentId = null) => {
    const { data, error } = await supabase
      .from('folders')
      .insert({ name, parent_id: parentId })
      .select()
      .single();
    if (error) throw error;
    set({ folders: [...get().folders, data as Folder] });
  },

  deleteFolder: async (id) => {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);
    if (error) throw error;

    // Move notes in this folder to uncategorized
    const affectedNotes = get().notes.filter((n) => n.folder_id === id);
    for (const note of affectedNotes) {
      await supabase.from('notes').update({ folder_id: null }).eq('id', note.id);
    }

    set({
      folders: get().folders.filter((f) => f.id !== id),
      notes: get().notes.map((n) =>
        n.folder_id === id ? { ...n, folder_id: null } : n
      ),
      selectedFolderId: get().selectedFolderId === id ? null : get().selectedFolderId,
    });
  },

  moveNoteToFolder: async (noteId, folderId) => {
    const { error } = await supabase
      .from('notes')
      .update({ folder_id: folderId })
      .eq('id', noteId);
    if (error) throw error;
    set({
      notes: get().notes.map((n) =>
        n.id === noteId ? { ...n, folder_id: folderId, updated_at: new Date().toISOString() } : n
      ),
    });
  },

  // ── UI actions ───────────────────────────────────────────────────────

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setOnline: (online) => set({ isOnline: online }),

  // ── Sync ─────────────────────────────────────────────────────────────

  syncLocalToRemote: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ syncStatus: 'syncing' });
    try {
      await syncNotes(user.id);
      // Re-fetch after sync
      await get().fetchNotes();
      await get().fetchFolders();
      set({ syncStatus: 'synced' });
    } catch {
      set({ syncStatus: 'pending' });
    }
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────

function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/^>\s/gm, '')
    .replace(/---/g, '')
    .replace(/\n{2,}/g, ' ');
}
