/**
 * GraphScreen.test.tsx -- Unit tests for the graph visualization screen.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

const mockNotes = [
  {
    id: 'n1',
    title: 'First Note',
    content: 'Content about [[Second Note]]',
    user_id: 'u1',
    created_at: '2026-05-18',
    updated_at: '2026-05-18',
    deleted_at: null,
  },
  {
    id: 'n2',
    title: 'Second Note',
    content: 'Linked note',
    user_id: 'u1',
    created_at: '2026-05-18',
    updated_at: '2026-05-18',
    deleted_at: null,
  },
];

let mockState: any;

jest.mock('../stores/notesStore', () => ({
  useNotesStore: (selector?: any) => (selector ? selector(mockState) : mockState),
}));

jest.mock('../contexts/ThemeContext', () => ({
  useThemeColors: () => ({
    background: '#FFFFFF',
    textSecondary: '#666666',
    primary: '#007AFF',
    border: '#F0F0F0',
  }),
}));

jest.mock('../i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'notes.noNotesYet': 'No notes yet',
    };
    return map[key] || key;
  },
}));

import GraphScreen from '../screens/GraphScreen';

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('GraphScreen', () => {
  it('renders empty state when no notes', () => {
    mockState = { notes: [] };
    render(<GraphScreen navigation={mockNavigation} />);
    expect(screen.getByText('No notes yet')).toBeTruthy();
  });

  it('renders notes as graph nodes', () => {
    mockState = { notes: mockNotes };
    render(<GraphScreen navigation={mockNavigation} />);
    expect(screen.getByText('First Note')).toBeTruthy();
    expect(screen.getByText('Second Note')).toBeTruthy();
  });

  it('shows correct note count by rendering all nodes', () => {
    mockState = { notes: mockNotes };
    render(<GraphScreen navigation={mockNavigation} />);
    // Both notes should appear as node labels
    const firstNode = screen.getByText('First Note');
    const secondNode = screen.getByText('Second Note');
    expect(firstNode).toBeTruthy();
    expect(secondNode).toBeTruthy();
  });

  it('navigates to NoteDetail on node press', () => {
    mockState = { notes: mockNotes };
    render(<GraphScreen navigation={mockNavigation} />);
    fireEvent.press(screen.getByText('First Note'));
    expect(mockNavigate).toHaveBeenCalledWith('NoteDetail', {
      noteId: 'n1',
      note: mockNotes[0],
    });
  });

  it('does not render empty state when notes exist', () => {
    mockState = { notes: mockNotes };
    render(<GraphScreen navigation={mockNavigation} />);
    expect(screen.queryByText('No notes yet')).toBeNull();
  });
});
