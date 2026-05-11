// jest.setup.js — Global mocks for native modules unavailable in Jest

// ── AsyncStorage (in-memory implementation) ──────────────────────────────
// Used by ThemeContext.tsx for persisting theme preference.
const storage = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key) => storage[key] ?? null),
    setItem: jest.fn(async (key, value) => { storage[key] = value; }),
    removeItem: jest.fn(async (key) => { delete storage[key]; }),
    getAllKeys: jest.fn(async () => Object.keys(storage)),
    multiGet: jest.fn(async (keys) => keys.map((k) => [k, storage[k] ?? null])),
    multiSet: jest.fn(async (entries) => { entries.forEach(([k, v]) => { storage[k] = v; }); }),
    multiRemove: jest.fn(async (keys) => { keys.forEach((k) => { delete storage[k]; }); }),
    clear: jest.fn(async () => { Object.keys(storage).forEach((k) => { delete storage[k]; }); }),
  },
}));

// ── supabase client ─────────────────────────────────────────────────────
// supabase.ts checks process.env.EXPO_PUBLIC_* at evaluation time and throws.
// Expo's babel-preset-expo replaces process.env.EXPO_PUBLIC_* at transpile time
// with undefined in the Jest environment, so env vars alone cannot fix this.
// We mock the entire supabase module to prevent the throw and provide a stub client.
const mockSupabaseQueryBuilder = () => {
  const builder = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    is: jest.fn(() => builder),
    order: jest.fn(() => builder),
    single: jest.fn(() => builder),
    then: jest.fn((resolve) => resolve({ data: null, error: null })),
  };
  return builder;
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(async () => ({ data: {}, error: null })),
      signUp: jest.fn(async () => ({ data: {}, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => mockSupabaseQueryBuilder()),
    rpc: jest.fn(async () => ({ data: null, error: null })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(async () => ({ data: {}, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
  },
}));

// ── expo-secure-store ────────────────────────────────────────────────────
// Used by supabase.ts as a SecureStorageAdapter for token persistence.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

// ── expo-sqlite ──────────────────────────────────────────────────────────
// Used by database/schema.ts for local note caching.
const mockDb = {
  runAsync: jest.fn(async () => {}),
  getAllAsync: jest.fn(async () => []),
  prepareAsync: jest.fn(async () => ({
    executeAsync: jest.fn(async () => {}),
    finalizeAsync: jest.fn(async () => {}),
  })),
  execAsync: jest.fn(async () => {}),
  closeAsync: jest.fn(async () => {}),
};
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}));

// ── expo-file-system ─────────────────────────────────────────────────────
// Used by NotesScreen (import), NoteDetailScreen (export), ImageUpload.
jest.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/cache/',
  readAsStringAsync: jest.fn(async () => ''),
  writeAsStringAsync: jest.fn(async () => {}),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

// ── expo-document-picker ─────────────────────────────────────────────────
// Used by NotesScreen for markdown import.
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

// ── expo-sharing ─────────────────────────────────────────────────────────
// Used by NoteDetailScreen for note export.
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(async () => {}),
}));

// ── expo-image-picker ────────────────────────────────────────────────────
// Used by ImageUpload component.
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

// ── react-native-markdown-display ────────────────────────────────────────
// Used by MarkdownPreview component.
jest.mock('react-native-markdown-display', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Markdown = (props) => React.createElement(Text, null, props.children);
  Markdown.displayName = 'Markdown';
  return { __esModule: true, default: Markdown };
});

// ── react-native-url-polyfill ────────────────────────────────────────────
// Side-effect import in supabase.ts; no-op in test environment.
jest.mock('react-native-url-polyfill', () => ({ __esModule: true, default: {} }));
jest.mock('react-native-url-polyfill/auto', () => ({ __esModule: true, default: {} }));
