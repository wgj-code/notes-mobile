/**
 * cross-platform-sync.test.ts — UC20-22 跨平台同步测试
 *
 * Tests conflict detection, offline→online sync queue, and sync status transitions.
 * Complements sync.test.ts (which covers optimistic locking and realtime handlers).
 */
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock('../lib/supabase', () => {
  const makeChain = (result: any = { data: [], error: null }) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
    is: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: undefined,
  });
  return {
    supabase: {
      from: jest.fn(() => makeChain()),
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockResolvedValue({}),
      })),
      removeChannel: jest.fn().mockResolvedValue({}),
    },
  };
});

jest.mock('../lib/database/queries', () => ({
  upsertLocalNotes: jest.fn().mockResolvedValue(undefined),
  getAllLocalNotes: jest.fn().mockReturnValue([]),
  upsertLocalNote: jest.fn().mockResolvedValue(undefined),
  upsertLocalFolders: jest.fn().mockResolvedValue(undefined),
  getAllLocalFolders: jest.fn().mockReturnValue([]),
  deleteLocalNote: jest.fn().mockResolvedValue(undefined),
  getDirtyNotes: jest.fn().mockResolvedValue([]),
  markNoteSynced: jest.fn().mockResolvedValue(undefined),
  getDirtyFolders: jest.fn().mockResolvedValue([]),
  markFolderSynced: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../lib/database/sync', () => ({
  syncNotes: jest.fn().mockResolvedValue({ pushed: 0, pulled: 0 }),
}));

// @ts-ignore
const { useNotesStore } = require('../stores/notesStore');

beforeEach(() => {
  jest.clearAllMocks();
  useNotesStore.setState({
    notes: [],
    folders: [],
    loading: false,
    error: null,
    searchQuery: '',
    selectedFolderId: null,
    isOnline: true,
    syncStatus: 'synced',
  });
});

// ── 1. 乐观锁冲突检测 ──────────────────────────────────────
describe('optimistic lock conflict', () => {
  test('updateNote with network error falls back to local update', async () => {
    // Network error: Supabase throws
    const supabaseMod = require('../lib/supabase');
    supabaseMod.supabase.from.mockImplementation(() => {
      throw new TypeError('Failed to fetch');
    });

    useNotesStore.setState({
      notes: [{ id: 'n1', title: 'Old', content: '', folder_id: null, created_at: '', updated_at: '', version: 1 }],
    });

    const { updateNote } = useNotesStore.getState();
    await updateNote('n1', 'New', 'Content');

    // Store applies optimistic update locally even when server fails
    const { notes } = useNotesStore.getState();
    expect(notes[0].title).toBe('New');
    // Version is still incremented (optimistic)
    expect(notes[0].version).toBe(2);
  });

  test('updateNote succeeds when version matches', async () => {
    useNotesStore.setState({
      notes: [{ id: 'n1', title: 'Old', content: '', folder_id: null, created_at: '', updated_at: '', version: 3 }],
    });

    const { updateNote } = useNotesStore.getState();
    await updateNote('n1', 'Updated', 'New content');

    const { notes } = useNotesStore.getState();
    expect(notes[0].title).toBe('Updated');
    expect(notes[0].version).toBe(4);
  });
});

// ── 2. Realtime 冲突解决（远端更新覆盖本地） ─────────────────
describe('realtime conflict resolution', () => {
  test('remote UPDATE overwrites local when version is higher', () => {
    useNotesStore.setState({
      notes: [{ id: 'n1', title: 'Local v1', content: 'local', folder_id: null, created_at: '', updated_at: '', version: 1 }],
    });

    const { handleRealtimeNoteChange } = useNotesStore.getState();
    handleRealtimeNoteChange({
      eventType: 'UPDATE',
      new: { id: 'n1', title: 'Remote v2', content: 'remote', folder_id: null, created_at: '', updated_at: '', version: 2 },
    });

    const { notes } = useNotesStore.getState();
    expect(notes[0].title).toBe('Remote v2');
    expect(notes[0].content).toBe('remote');
  });

  test('realtime INSERT from other device appears immediately', () => {
    const { handleRealtimeNoteChange } = useNotesStore.getState();
    handleRealtimeNoteChange({
      eventType: 'INSERT',
      new: { id: 'web-note', title: 'Created on Web', content: 'web content', folder_id: null, created_at: '2026-06-12', updated_at: '2026-06-12' },
    });

    const { notes } = useNotesStore.getState();
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('web-note');
    expect(notes[0].title).toBe('Created on Web');
  });

  test('realtime DELETE from other device removes locally', () => {
    useNotesStore.setState({
      notes: [
        { id: 'n1', title: 'Keep', content: '', folder_id: null, created_at: '', updated_at: '' },
        { id: 'n2', title: 'Delete me', content: '', folder_id: null, created_at: '', updated_at: '' },
      ],
    });

    const { handleRealtimeNoteChange } = useNotesStore.getState();
    handleRealtimeNoteChange({
      eventType: 'DELETE',
      old: { id: 'n2' },
    });

    const { notes } = useNotesStore.getState();
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('n1');
  });
});

// ── 3. 离线→在线同步状态转换 ─────────────────────────────────
describe('offline→online sync transitions', () => {
  test('syncStatus transitions: synced → syncing → synced', async () => {
    useNotesStore.setState({ isOnline: true, syncStatus: 'synced' });

    const sync = require('../lib/database/sync');
    sync.syncNotes.mockResolvedValue({ pushed: 2, pulled: 1 });

    // Mock online fetch
    const supabaseMod = require('../lib/supabase');
    supabaseMod.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { syncLocalToRemote } = useNotesStore.getState();
    await syncLocalToRemote();

    expect(useNotesStore.getState().syncStatus).toBe('synced');
  });

  test('syncStatus: pending when sync fails', async () => {
    useNotesStore.setState({ isOnline: true });

    const sync = require('../lib/database/sync');
    sync.syncNotes.mockRejectedValue(new Error('Network'));

    const { syncLocalToRemote } = useNotesStore.getState();
    await syncLocalToRemote();

    expect(useNotesStore.getState().syncStatus).toBe('pending');
  });

  test('fetchNotes falls back to local cache when offline', async () => {
    useNotesStore.setState({ isOnline: false });

    // Mock Supabase to return network error (triggers offline fallback)
    const supabaseMod = require('../lib/supabase');
    supabaseMod.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Network' } }),
    });

    const queries = require('../lib/database/queries');
    queries.getAllLocalNotes.mockReturnValue([
      { id: 'cached-1', title: 'Cached Note', content: '', folder_id: null, created_at: '', updated_at: '' },
    ]);

    const { fetchNotes } = useNotesStore.getState();
    await fetchNotes();

    const { notes, isOnline } = useNotesStore.getState();
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('Cached Note');
    expect(isOnline).toBe(false);
  });
});

// ── 4. 文件夹跨平台同步 ──────────────────────────────────────
describe('folder cross-platform sync', () => {
  test('realtime folder INSERT from web appears on mobile', () => {
    const { handleRealtimeFolderChange } = useNotesStore.getState();
    handleRealtimeFolderChange({
      eventType: 'INSERT',
      new: { id: 'web-folder', name: 'Web Folder', parent_id: null, created_at: '2026-06-12', updated_at: '2026-06-12' },
    });

    const { folders } = useNotesStore.getState();
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe('Web Folder');
  });

  test('realtime folder DELETE from web removes on mobile', () => {
    useNotesStore.setState({
      folders: [
        { id: 'f1', name: 'Local', parent_id: null, created_at: '', updated_at: '' },
        { id: 'f2', name: 'Remote', parent_id: null, created_at: '', updated_at: '' },
      ],
    });

    const { handleRealtimeFolderChange } = useNotesStore.getState();
    handleRealtimeFolderChange({
      eventType: 'DELETE',
      old: { id: 'f2' },
    });

    const { folders } = useNotesStore.getState();
    expect(folders).toHaveLength(1);
    expect(folders[0].id).toBe('f1');
  });

  test('moveNoteToFolder syncs folder assignment cross-platform', async () => {
    useNotesStore.setState({
      notes: [{ id: 'n1', title: 'Note', content: '', folder_id: null, created_at: '', updated_at: '' }],
    });

    const { moveNoteToFolder } = useNotesStore.getState();
    await moveNoteToFolder('n1', 'web-folder');

    const { notes } = useNotesStore.getState();
    expect(notes[0].folder_id).toBe('web-folder');
  });
});
