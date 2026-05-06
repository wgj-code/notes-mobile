import React from 'react';
import { render, screen } from '@testing-library/react-native';
import EmptyState from '../components/EmptyState';

describe('EmptyState', () => {
  it('renders empty state message', () => {
    render(<EmptyState />);
    expect(screen.getByText('No notes yet')).toBeTruthy();
  });

  it('renders tap hint', () => {
    render(<EmptyState />);
    expect(screen.getByText('Tap + to create one')).toBeTruthy();
  });
});
