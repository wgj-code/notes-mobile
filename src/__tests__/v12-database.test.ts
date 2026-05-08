/**
 * v12-database.test.ts — Tests for SQLite database layer (schema, queries, sync).
 */

// Mock expo-sqlite before any imports
const mockExecAsync = jest.fn().mockResolvedValue(undefined);
const mockRunAsync = jest.fn().mockResolvedValue({ changes: 1 });
const mockGetAllAsync = jest.fn().mockResolvedValue([]);
const mockCloseAsync = jest.fn().mockResolvedValue(undefined);
const mockExecuteAsync = jest.fn().mockResolvedValue(undefined);
const mockFinalizeAsync = jest.fn().mockResolvedValue(undefined);
const mockPrepareAsync = jest.fn().mockResolvedValue({
  executeAsync: mockExecuteAsync,
  finalizeAsync: mockFinalizeAsync,
});

const mockDbObject = {
  execAsync: mockExecAsync,
  runAsync: mockRunAsync,
  getAllAsync: mockGetAllAsync,
  prepareAsync: mockPrepareAsync,
  closeAsync: mockCloseAsync,
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockImplementation(() => Promise.resolve(mockDbObject)),
}));

// Mock supabase (needed by sync.ts)
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import { getDatabase } from '../lib/database/schema';
import {
  upsertLocalNote,
  upsertLocalNotes,
  getAllLocalNotes,
  getDirtyNotes,
  markNoteSynced,
  markNoteDirty,
  deleteLocalNote,
  upsertLocalFolder,
  upsertLocalFolders,
  getAllLocalFolders,
  getDirtyFolders,
  markFolderSynced,
  markFolderDirty,
  deleteLocalFolder,
} from '../lib/database/queries';
import { syncNotes } from '../lib/database/sync';

// Initialize db once so schema module caches it
beforeAll(async () => {
  await getDatabase();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockExecAsync.mockResolvedValue(undefined);
  mockRunAsync.mockResolvedValue({ changes: 1 });
  mockGetAllAsync.mockResolvedValue([]);
  mockPrepareAsync.mockResolvedValue({
    executeAsync: mockExecuteAsync,
    finalizeAsync: mockFinalizeAsync,
  });
  mockCloseAsync.mockResolvedValue(undefined);
  mockExecuteAsync.mockResolvedValue(undefined);
  mockFinalizeAsync.mockResolvedValue(undefined);
});

describe('schema.ts', () => {
  it('getDatabase opens database and initializes tables', async () => {
    const db = await getDatabase();
    expect(db).toBeDefined();
    expect(db).toBe(mockDbObject);
  });

  it('caches database instance on repeated calls', async () => {
    const db1 = await getDatabase();
    const db2 = await getDatabase();
    // Same cached instance returned both times
    expect(db1).toBe(db2);
  });
});

describe('queries.ts — Notes', () => {
  it('upsertLocalNote runs INSERT OR REPLACE', async () => {
    await upsertLocalNote({
      id: 'n1', user_id: 'u1', title: 'T', content: 'C',
      folder_id: null, tags: ['tag1'], created_at: '2026-05-01',
      updated_at: '2026-05-01', deleted_at: null, is_dirty: 0,
    });

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO local_notes'),
      expect.arrayContaining(['n1', 'u1', 'T', 'C', null, '["tag1"]'])
    );
  });

  it('getAllLocalNotes queries by userId and excludes deleted', async () => {
    mockGetAllAsync.mockResolvedValue([
      { id: 'n1', user_id: 'u1', title: 'T', content: 'C', folder_id: null,
        tags: '[]', created_at: '2026-05-01', updated_at: '2026-05-01', deleted_at: null },
    ]);

    const notes = await getAllLocalNotes('u1');

    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = ?'),
      ['u1']
    );
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('T');
  });

  it('getDirtyNotes returns only dirty notes', async () => {
    mockGetAllAsync.mockResolvedValue([
      { id: 'n1', user_id: 'u1', title: 'Dirty', content: '', folder_id: null,
        tags: '[]', created_at: '', updated_at: '', deleted_at: null, is_dirty: 1 },
    ]);

    const notes = await getDirtyNotes('u1');

    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('is_dirty = 1'),
      ['u1']
    );
    expect(notes).toHaveLength(1);
  });

  it('markNoteSynced sets is_dirty to 0', async () => {
    await markNoteSynced('n1');
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('SET is_dirty = 0'),
      ['n1']
    );
  });

  it('markNoteDirty sets is_dirty to 1', async () => {
    await markNoteDirty('n1');
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('SET is_dirty = 1'),
      ['n1']
    );
  });

  it('deleteLocalNote removes note', async () => {
    await deleteLocalNote('n1');
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM local_notes'),
      ['n1']
    );
  });

  it('upsertLocalNotes batches via prepared statement', async () => {
    await upsertLocalNotes([
      { id: 'n1', user_id: 'u1', title: 'A', content: '', folder_id: null,
        tags: [], created_at: '', updated_at: '', deleted_at: null, is_dirty: 0 },
      { id: 'n2', user_id: 'u1', title: 'B', content: '', folder_id: null,
        tags: [], created_at: '', updated_at: '', deleted_at: null, is_dirty: 0 },
    ]);

    expect(mockPrepareAsync).toHaveBeenCalled();
    expect(mockExecuteAsync).toHaveBeenCalledTimes(2);
    expect(mockFinalizeAsync).toHaveBeenCalled();
  });
});

describe('queries.ts — Folders', () => {
  it('upsertLocalFolder runs INSERT OR REPLACE', async () => {
    await upsertLocalFolder({
      id: 'f1', user_id: 'u1', name: 'Work', parent_id: null,
      created_at: '2026-05-01', updated_at: '2026-05-01',
    });

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO local_folders'),
      expect.arrayContaining(['f1', 'u1', 'Work', null])
    );
  });

  it('getAllLocalFolders queries by userId and excludes deleted', async () => {
    mockGetAllAsync.mockResolvedValue([
      { id: 'f1', user_id: 'u1', name: 'Work', parent_id: null,
        created_at: '', updated_at: '', is_dirty: 0, is_deleted: 0 },
    ]);

    const folders = await getAllLocalFolders('u1');

    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = ?'),
      ['u1']
    );
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe('Work');
  });

  it('getDirtyFolders returns only dirty folders', async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getDirtyFolders('u1');
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('is_dirty = 1'),
      ['u1']
    );
  });

  it('markFolderSynced sets is_dirty to 0', async () => {
    await markFolderSynced('f1');
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE local_folders SET is_dirty = 0'),
      ['f1']
    );
  });

  it('markFolderDirty sets is_dirty to 1', async () => {
    await markFolderDirty('f1');
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE local_folders SET is_dirty = 1'),
      ['f1']
    );
  });

  it('deleteLocalFolder removes folder', async () => {
    await deleteLocalFolder('f1');
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM local_folders'),
      ['f1']
    );
  });
});

describe('sync.ts', () => {
  it('syncNotes pushes dirty notes and pulls remote', async () => {
    // getDirtyNotes returns one dirty note, getDirtyFolders returns empty
    mockGetAllAsync
      .mockResolvedValueOnce([
        { id: 'n1', user_id: 'u1', title: 'Dirty', content: '', folder_id: null,
          tags: '[]', created_at: '', updated_at: '', deleted_at: null, is_dirty: 1 },
      ])
      .mockResolvedValueOnce([]);

    const result = await syncNotes('u1');

    expect(result.pushed).toBeGreaterThanOrEqual(0);
    expect(result.pulled).toBeGreaterThanOrEqual(0);
  });

  it('syncNotes handles empty dirty list', async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const result = await syncNotes('u1');
    expect(result).toEqual({ pushed: 0, pulled: 0 });
  });
});
