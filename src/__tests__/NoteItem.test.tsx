import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import NoteItem from '../components/NoteItem';
import type { Note } from '../types';

const mockNote: Note = {
  id: '1',
  title: 'Test Note',
  content: 'This is test content',
  user_id: 'user-1',
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  deleted_at: null,
};

describe('NoteItem', () => {
  it('renders title and content', () => {
    render(<NoteItem note={mockNote} onPress={() => {}} />);
    expect(screen.getByText('Test Note')).toBeTruthy();
    expect(screen.getByText('This is test content')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<NoteItem note={mockNote} onPress={onPress} />);
    fireEvent.press(screen.getByText('Test Note'));
    expect(onPress).toHaveBeenCalledWith(mockNote);
  });

  it('renders updated date', () => {
    render(<NoteItem note={mockNote} onPress={() => {}} />);
    expect(screen.getByText('5/1/2026')).toBeTruthy();
  });
});
