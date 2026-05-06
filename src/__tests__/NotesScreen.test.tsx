import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NotesScreen from '../screens/NotesScreen';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

const mockState = {
  notes: [],
  loading: false,
  error: null,
  fetchNotes: jest.fn(),
  deleteNote: jest.fn(),
};

jest.mock('../stores/notesStore', () => ({
  useNotesStore: (selector?: any) => selector ? selector(mockState) : mockState,
}));

describe('NotesScreen', () => {
  it('renders empty state when no notes', () => {
    render(<NotesScreen navigation={mockNavigation} />);
    expect(screen.getByText('No notes yet')).toBeTruthy();
  });

  it('renders FAB button', () => {
    render(<NotesScreen navigation={mockNavigation} />);
    expect(screen.getByText('+')).toBeTruthy();
  });
});
