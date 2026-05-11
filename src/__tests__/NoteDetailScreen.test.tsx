import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NoteDetailScreen from '../screens/NoteDetailScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack, setOptions: mockSetOptions };
const mockRoute = { params: { noteId: null, note: undefined } };

const mockNotesState = {
  notes: [],
  folders: [],
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
  fetchFolders: jest.fn(),
};

jest.mock('../stores/notesStore', () => ({
  useNotesStore: (selector?: any) => selector ? selector(mockNotesState) : mockNotesState,
}));

jest.mock('../lib/supabase-helpers', () => ({
  mapSupabaseError: jest.fn(),
  getUserMessage: jest.fn(),
}));

describe('NoteDetailScreen', () => {
  it('renders title input', () => {
    render(<NoteDetailScreen route={mockRoute} navigation={mockNavigation} />);
    expect(screen.getByPlaceholderText('Title')).toBeTruthy();
  });

  it('renders content input', () => {
    render(<NoteDetailScreen route={mockRoute} navigation={mockNavigation} />);
    expect(screen.getByPlaceholderText('Start writing...')).toBeTruthy();
  });

  it('sets header title to New Note for new note', () => {
    render(<NoteDetailScreen route={mockRoute} navigation={mockNavigation} />);
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Note' })
    );
  });
});
