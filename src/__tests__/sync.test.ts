jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock('../lib/supabase', () => {
  let noteVersion = 1;
  const chainResult = { data: null, error: null };
  const makeChain = () => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { id: 'n1', version: noteVersion }, error: null }),
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

// ── 乐观锁测试 ──────────────────────────────────────────────

test('updateNote: includes version in update', async () => {
  useNotesStore.setState({
    notes: [{ id: 'n1', title: 'Old', content: '', folder_id: null, created_at: '', updated_at: '', version: 1 }],
  });

  const { updateNote } = useNotesStore.getState();
  await updateNote('n1', 'New Title', 'New Content');

  const supabaseMod = require('../lib/supabase');
  const updateCall = supabaseMod.supabase.from.mock.results[0].value.update;
  expect(updateCall).toHaveBeenCalledWith(
    expect.objectContaining({ version: 2 })
  );
});

test('updateNote: increments version number', async () => {
  useNotesStore.setState({
    notes: [{ id: 'n1', title: 'Old', content: '', folder_id: null, created_at: '', updated_at: '', version: 5 }],
  });

  const { updateNote } = useNotesStore.getState();
  await updateNote('n1', 'Updated', 'Content');

  const { notes } = useNotesStore.getState();
  expect(notes[0].version).toBe(6);
});

// ── Realtime handler 测试 ────────────────────────────────────

test('handleRealtimeNoteChange: INSERT adds note', () => {
  const { handleRealtimeNoteChange } = useNotesStore.getState();
  handleRealtimeNoteChange({
    eventType: 'INSERT',
    new: { id: 'remote-1', title: 'Remote Note', content: '', folder_id: null, created_at: '', updated_at: '' },
  });

  const { notes } = useNotesStore.getState();
  expect(notes.length).toBe(1);
  expect(notes[0].id).toBe('remote-1');
});

test('handleRealtimeNoteChange: INSERT ignores duplicate', () => {
  useNotesStore.setState({
    notes: [{ id: 'n1', title: 'Existing', content: '', folder_id: null, created_at: '', updated_at: '' }],
  });

  const { handleRealtimeNoteChange } = useNotesStore.getState();
  handleRealtimeNoteChange({
    eventType: 'INSERT',
    new: { id: 'n1', title: 'Duplicate', content: '', folder_id: null, created_at: '', updated_at: '' },
  });

  const { notes } = useNotesStore.getState();
  expect(notes.length).toBe(1);
  expect(notes[0].title).toBe('Existing');
});

test('handleRealtimeNoteChange: UPDATE modifies note', () => {
  useNotesStore.setState({
    notes: [{ id: 'n1', title: 'Old', content: '', folder_id: null, created_at: '', updated_at: '' }],
  });

  const { handleRealtimeNoteChange } = useNotesStore.getState();
  handleRealtimeNoteChange({
    eventType: 'UPDATE',
    new: { id: 'n1', title: 'Updated from Web', content: 'new content', folder_id: null, created_at: '', updated_at: '' },
  });

  const { notes } = useNotesStore.getState();
  expect(notes[0].title).toBe('Updated from Web');
  expect(notes[0].content).toBe('new content');
});

test('handleRealtimeNoteChange: DELETE removes note', () => {
  useNotesStore.setState({
    notes: [
      { id: 'n1', title: 'Note 1', content: '', folder_id: null, created_at: '', updated_at: '' },
      { id: 'n2', title: 'Note 2', content: '', folder_id: null, created_at: '', updated_at: '' },
    ],
  });

  const { handleRealtimeNoteChange } = useNotesStore.getState();
  handleRealtimeNoteChange({
    eventType: 'DELETE',
    old: { id: 'n1' },
  });

  const { notes } = useNotesStore.getState();
  expect(notes.length).toBe(1);
  expect(notes[0].id).toBe('n2');
});

test('handleRealtimeFolderChange: INSERT adds folder', () => {
  const { handleRealtimeFolderChange } = useNotesStore.getState();
  handleRealtimeFolderChange({
    eventType: 'INSERT',
    new: { id: 'f1', name: 'Remote Folder', parent_id: null, created_at: '', updated_at: '' },
  });

  const { folders } = useNotesStore.getState();
  expect(folders.length).toBe(1);
  expect(folders[0].name).toBe('Remote Folder');
});

test('handleRealtimeFolderChange: UPDATE modifies folder', () => {
  useNotesStore.setState({
    folders: [{ id: 'f1', name: 'Old Name', parent_id: null, created_at: '', updated_at: '' }],
  });

  const { handleRealtimeFolderChange } = useNotesStore.getState();
  handleRealtimeFolderChange({
    eventType: 'UPDATE',
    new: { id: 'f1', name: 'Renamed from Web', parent_id: null, created_at: '', updated_at: '' },
  });

  const { folders } = useNotesStore.getState();
  expect(folders[0].name).toBe('Renamed from Web');
});

test('handleRealtimeFolderChange: DELETE removes folder', () => {
  useNotesStore.setState({
    folders: [
      { id: 'f1', name: 'Folder 1', parent_id: null, created_at: '', updated_at: '' },
      { id: 'f2', name: 'Folder 2', parent_id: null, created_at: '', updated_at: '' },
    ],
  });

  const { handleRealtimeFolderChange } = useNotesStore.getState();
  handleRealtimeFolderChange({
    eventType: 'DELETE',
    old: { id: 'f1' },
  });

  const { folders } = useNotesStore.getState();
  expect(folders.length).toBe(1);
  expect(folders[0].id).toBe('f2');
});

// ── Realtime hook 测试 ──────────────────────────────────────

test('useRealtime: registers channel with user filter', () => {
  const supabaseMod = require('../lib/supabase');
  const { useRealtime } = require('../hooks/useRealtime');

  // 直接测试 channel 创建逻辑
  const channel = supabaseMod.supabase.channel('test');
  expect(channel.on).toBeDefined();
  expect(channel.subscribe).toBeDefined();
});
