import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RecycleBinScreen from '../screens/RecycleBinScreen';

const mockFetchDeletedNotes = jest.fn();
const mockRestoreNote = jest.fn();
const mockPermanentDeleteNote = jest.fn();

const mockState = {
  deletedNotes: [],
  fetchDeletedNotes: mockFetchDeletedNotes,
  restoreNote: mockRestoreNote,
  permanentDeleteNote: mockPermanentDeleteNote,
};

jest.mock('../stores/notesStore', () => ({
  useNotesStore: (selector?: any) => (selector ? selector(mockState) : mockState),
}));

describe('RecycleBinScreen', () => {
  const mockNavigation = {};
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockState.deletedNotes = [];
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it('renders empty state when no deleted notes', () => {
    render(<RecycleBinScreen navigation={mockNavigation} />);
    expect(screen.getByText('No deleted notes')).toBeTruthy();
  });

  it('calls fetchDeletedNotes on mount', () => {
    render(<RecycleBinScreen navigation={mockNavigation} />);
    expect(mockFetchDeletedNotes).toHaveBeenCalledTimes(1);
  });

  it('renders deleted notes list', () => {
    mockState.deletedNotes = [
      {
        id: '1',
        title: 'Deleted Note 1',
        content: '',
        user_id: 'u1',
        folder_id: null,
        tags: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: '2026-01-02T00:00:00Z',
      },
      {
        id: '2',
        title: 'Deleted Note 2',
        content: '',
        user_id: 'u1',
        folder_id: null,
        tags: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: '2026-01-03T00:00:00Z',
      },
    ];

    render(<RecycleBinScreen navigation={mockNavigation} />);
    expect(screen.getByText('Deleted Note 1')).toBeTruthy();
    expect(screen.getByText('Deleted Note 2')).toBeTruthy();
  });

  it('shows restore and delete buttons for each note', () => {
    mockState.deletedNotes = [
      {
        id: '1',
        title: 'My Note',
        content: '',
        user_id: 'u1',
        folder_id: null,
        tags: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: '2026-01-02T00:00:00Z',
      },
    ];

    render(<RecycleBinScreen navigation={mockNavigation} />);
    expect(screen.getByText('Restore')).toBeTruthy();
    expect(screen.getByText('Permanently Delete')).toBeTruthy();
  });

  it('shows alert when restore button pressed', () => {
    mockState.deletedNotes = [
      {
        id: '1',
        title: 'My Note',
        content: '',
        user_id: 'u1',
        folder_id: null,
        tags: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: '2026-01-02T00:00:00Z',
      },
    ];

    render(<RecycleBinScreen navigation={mockNavigation} />);
    fireEvent.press(screen.getByText('Restore'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Restore',
      'My Note?',
      expect.any(Array)
    );
  });

  it('shows alert when permanent delete button pressed', () => {
    mockState.deletedNotes = [
      {
        id: '1',
        title: 'My Note',
        content: '',
        user_id: 'u1',
        folder_id: null,
        tags: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: '2026-01-02T00:00:00Z',
      },
    ];

    render(<RecycleBinScreen navigation={mockNavigation} />);
    fireEvent.press(screen.getByText('Permanently Delete'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Permanently Delete',
      expect.any(String),
      expect.any(Array)
    );
  });
});
