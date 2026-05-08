/**
 * v12-notesStore.test.ts — Tests for V1.2 extensions to notesStore:
 * folders state, fetchFolders, createFolder, deleteFolder,
 * filteredNotes by folder, filteredNotes by search.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
  },
}));

// Mock database layer (avoid real SQLite)
jest.mock('../lib/database/queries', () => ({
  upsertLocalNotes: jest.fn().mockResolvedValue(undefined),
  getAllLocalNotes: jest.fn().mockResolvedValue([]),
  upsertLocalFolders: jest.fn().mockResolvedValue(undefined),
  getAllLocalFolders: jest.fn().mockResolvedValue([]),
}));

jest.mock('../lib/database/sync', () => ({
  syncNotes: jest.fn().mockResolvedValue({ pushed: 0, pulled: 0 }),
}));

import { useNotesStore } from '../stores/notesStore';
import { supabase } from '../lib/supabase';
import type { Note, Folder } from '../types';

const mockNote: Note = {
  id: 'n1', title: 'Test', content: 'Body', user_id: 'u1',
  folder_id: null, tags: [], created_at: '2026-05-01', updated_at: '2026-05-06', deleted_at: null,
};

const mockFolder: Folder = {
  id: 'f1', user_id: 'u1', name: 'Work', parent_id: null,
  created_at: '2026-05-01', updated_at: '2026-05-01',
};

beforeEach(() => {
  jest.clearAllMocks();
  useNotesStore.setState({
    notes: [], folders: [], loading: false, error: null,
    selectedFolderId: null, searchQuery: '', isOnline: true, syncStatus: 'synced',
  });
});

function makeQuery(overrides: Record<string, any> = {}) {
  return {
    select: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
}

describe('notesStore V1.2 — state', () => {
  it('initializes folders as empty array', () => {
    expect(useNotesStore.getState().folders).toEqual([]);
  });

  it('initializes selectedFolderId as null', () => {
    expect(useNotesStore.getState().selectedFolderId).toBeNull();
  });

  it('initializes searchQuery as empty string', () => {
    expect(useNotesStore.getState().searchQuery).toBe('');
  });

  it('initializes syncStatus as synced', () => {
    expect(useNotesStore.getState().syncStatus).toBe('synced');
  });
});

describe('notesStore V1.2 — fetchFolders', () => {
  it('loads folders into state', async () => {
    const q = makeQuery({
      order: jest.fn().mockResolvedValue({ data: [mockFolder], error: null }),
    });
    (supabase.from as jest.Mock).mockReturnValue(q);

    await useNotesStore.getState().fetchFolders();
    expect(useNotesStore.getState().folders).toEqual([mockFolder]);
  });

  it('does not overwrite on error', async () => {
    const q = makeQuery({
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
    });
    (supabase.from as jest.Mock).mockReturnValue(q);

    await useNotesStore.getState().fetchFolders();
    expect(useNotesStore.getState().folders).toEqual([]);
  });
});

describe('notesStore V1.2 — createFolder', () => {
  it('adds new folder to state', async () => {
    const q = makeQuery({
      single: jest.fn().mockResolvedValue({ data: mockFolder, error: null }),
    });
    (supabase.from as jest.Mock).mockReturnValue(q);

    await useNotesStore.getState().createFolder('Work');
    expect(useNotesStore.getState().folders).toContainEqual(mockFolder);
  });

  it('throws on failure', async () => {
    const q = makeQuery({
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
    });
    (supabase.from as jest.Mock).mockReturnValue(q);

    await expect(useNotesStore.getState().createFolder('Work')).rejects.toBeDefined();
  });
});

describe('notesStore V1.2 — deleteFolder', () => {
  it('removes folder from state', async () => {
    useNotesStore.setState({ folders: [mockFolder] });
    const q = makeQuery();
    (supabase.from as jest.Mock).mockReturnValue(q);

    await useNotesStore.getState().deleteFolder('f1');
    expect(useNotesStore.getState().folders).toHaveLength(0);
  });

  it('clears selectedFolderId if deleting the selected folder', async () => {
    useNotesStore.setState({ folders: [mockFolder], selectedFolderId: 'f1' });
    const q = makeQuery();
    (supabase.from as jest.Mock).mockReturnValue(q);

    await useNotesStore.getState().deleteFolder('f1');
    expect(useNotesStore.getState().selectedFolderId).toBeNull();
  });

  it('preserves selectedFolderId if deleting a different folder', async () => {
    const folder2 = { ...mockFolder, id: 'f2', name: 'Personal' };
    useNotesStore.setState({ folders: [mockFolder, folder2], selectedFolderId: 'f2' });
    const q = makeQuery();
    (supabase.from as jest.Mock).mockReturnValue(q);

    await useNotesStore.getState().deleteFolder('f1');
    expect(useNotesStore.getState().selectedFolderId).toBe('f2');
  });
});

describe('notesStore V1.2 — filteredNotes', () => {
  const noteInFolder: Note = { ...mockNote, id: 'n2', folder_id: 'f1', title: 'Work project' };
  const noteUncategorized: Note = { ...mockNote, id: 'n3', folder_id: null, title: 'Quick note' };
  const noteWithTags: Note = { ...mockNote, id: 'n4', folder_id: 'f1', tags: ['react', 'test'], title: 'React notes' };

  beforeEach(() => {
    useNotesStore.setState({
      notes: [noteInFolder, noteUncategorized, noteWithTags],
    });
  });

  it('returns all notes when no folder or search filter', () => {
    expect(useNotesStore.getState().filteredNotes()).toHaveLength(3);
  });

  it('filters by selectedFolderId', () => {
    useNotesStore.setState({ selectedFolderId: 'f1' });
    const result = useNotesStore.getState().filteredNotes();
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toEqual(['n2', 'n4']);
  });

  it('filters uncategorized notes', () => {
    useNotesStore.setState({ selectedFolderId: '__uncategorized' });
    const result = useNotesStore.getState().filteredNotes();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n3');
  });

  it('filters by search query in title', () => {
    useNotesStore.setState({ searchQuery: 'work' });
    const result = useNotesStore.getState().filteredNotes();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Work project');
  });

  it('filters by search query in content', () => {
    useNotesStore.setState({ searchQuery: 'Body' });
    const result = useNotesStore.getState().filteredNotes();
    expect(result).toHaveLength(3); // all notes have content "Body"
  });

  it('search is case-insensitive', () => {
    useNotesStore.setState({ searchQuery: 'WORK' });
    const result = useNotesStore.getState().filteredNotes();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Work project');
  });

  it('combines folder and search filters', () => {
    useNotesStore.setState({ selectedFolderId: 'f1', searchQuery: 'react' });
    const result = useNotesStore.getState().filteredNotes();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n4');
  });

  it('returns empty when search matches nothing', () => {
    useNotesStore.setState({ searchQuery: 'zzzznotfound' });
    expect(useNotesStore.getState().filteredNotes()).toHaveLength(0);
  });
});

describe('notesStore V1.2 — UI actions', () => {
  it('setSearchQuery updates searchQuery', () => {
    useNotesStore.getState().setSearchQuery('test');
    expect(useNotesStore.getState().searchQuery).toBe('test');
  });

  it('setSelectedFolderId updates selectedFolderId', () => {
    useNotesStore.getState().setSelectedFolderId('f1');
    expect(useNotesStore.getState().selectedFolderId).toBe('f1');
  });

  it('setSelectedFolderId can be set to null', () => {
    useNotesStore.getState().setSelectedFolderId('f1');
    useNotesStore.getState().setSelectedFolderId(null);
    expect(useNotesStore.getState().selectedFolderId).toBeNull();
  });

  it('setOnline updates isOnline', () => {
    useNotesStore.getState().setOnline(false);
    expect(useNotesStore.getState().isOnline).toBe(false);
  });
});
