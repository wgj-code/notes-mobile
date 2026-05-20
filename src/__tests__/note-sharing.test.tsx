/**
 * note-sharing.test.tsx — Mobile Note Sharing (P0)
 *
 * Tests for share button rendering in NoteDetailScreen and share function invocation.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NoteDetailScreen from '../screens/NoteDetailScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockPush = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack, push: mockPush, setOptions: mockSetOptions };

const mockCreateNote = jest.fn();
const mockUpdateNote = jest.fn();
const mockDeleteNote = jest.fn();
const mockFetchFolders = jest.fn();
const mockShareNote = jest.fn();
const mockCreateTemplate = jest.fn();

const mockNotesState = {
  notes: [],
  folders: [],
  createNote: mockCreateNote,
  updateNote: mockUpdateNote,
  deleteNote: mockDeleteNote,
  fetchFolders: mockFetchFolders,
  shareNote: mockShareNote,
};

const mockTemplateState = {
  createTemplate: mockCreateTemplate,
};

jest.mock('../stores/notesStore', () => ({
  useNotesStore: (selector?: any) => (selector ? selector(mockNotesState) : mockNotesState),
  getState: () => mockNotesState,
}));

jest.mock('../stores/templateStore', () => ({
  useTemplateStore: (selector?: any) => (selector ? selector(mockTemplateState) : mockTemplateState),
}));

jest.mock('../lib/supabase-helpers', () => ({
  mapSupabaseError: jest.fn(() => 'UNKNOWN'),
  getUserMessage: jest.fn(() => 'An error occurred'),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/mock-cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { UTF8: 'utf8' },
}));

describe('Note Sharing (Mobile)', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockShareNote.mockResolvedValue(undefined);
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  const editingNote = {
    id: 'note-share-1',
    title: 'Shareable Note',
    content: 'Content to share',
    user_id: 'u1',
    folder_id: null,
    tags: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  };

  it('renders share button in header when editing an existing note', () => {
    render(
      <NoteDetailScreen
        route={{ params: { noteId: 'note-share-1', note: editingNote } }}
        navigation={mockNavigation}
      />
    );

    // setOptions is called with headerRight; the share text is set via i18n key
    const headerRightCall = mockSetOptions.mock.calls.find(
      (call) => call[0].headerRight
    );
    expect(headerRightCall).toBeTruthy();
  });

  it('shareNote is called with correct noteId when share is triggered', async () => {
    render(
      <NoteDetailScreen
        route={{ params: { noteId: 'note-share-1', note: editingNote } }}
        navigation={mockNavigation}
      />
    );

    // Extract the headerRight render function and find the share button
    const headerRightCall = mockSetOptions.mock.calls.find(
      (call) => call[0].headerRight
    );
    expect(headerRightCall).toBeTruthy();

    // Render the headerRight element to access its children
    const headerRightElement = headerRightCall![0].headerRight();
    const { getByText } = render(headerRightElement);

    // Find and press the share button (i18n t() returns translated text)
    const shareButton = getByText('Share');
    fireEvent.press(shareButton);

    // Allow async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockShareNote).toHaveBeenCalledWith('note-share-1');
  });

  it('does not show share button for a new note (noteId is null)', () => {
    render(
      <NoteDetailScreen
        route={{ params: { noteId: null, note: undefined } }}
        navigation={mockNavigation}
      />
    );

    const headerRightCall = mockSetOptions.mock.calls.find(
      (call) => call[0].headerRight
    );
    expect(headerRightCall).toBeTruthy();

    // Render the header and check share button is not present
    const headerRightElement = headerRightCall![0].headerRight();
    const { queryByText } = render(headerRightElement);
    expect(queryByText('Share')).toBeNull();
  });

  it('share button renders in header alongside other actions', () => {
    render(
      <NoteDetailScreen
        route={{ params: { noteId: 'note-share-1', note: editingNote } }}
        navigation={mockNavigation}
      />
    );

    const headerRightCall = mockSetOptions.mock.calls.find(
      (call) => call[0].headerRight
    );
    const headerRightElement = headerRightCall![0].headerRight();
    const { getByText } = render(headerRightElement);

    // Share, Export, and Save & Close should all be present
    expect(getByText('Share')).toBeTruthy();
    expect(getByText('Export')).toBeTruthy();
    expect(getByText('Save & Close')).toBeTruthy();
  });
});
