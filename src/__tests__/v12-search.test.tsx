/**
 * v12-search.test.tsx — Tests for SearchBar component.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

// Mock i18n before any imports that use it
jest.mock('../i18n', () => ({
  t: (key: string) => key,
  getLanguage: jest.fn(() => 'en'),
  setLanguage: jest.fn(),
}));

// Mock notesStore — handle both useNotesStore() and useNotesStore(selector)
jest.mock('../stores/notesStore', () => ({
  useNotesStore: Object.assign(
    (selectorOrFn?: (s: any) => any) =>
      typeof selectorOrFn === 'function' ? selectorOrFn(mockState) : mockState,
    {
      getState: () => mockState,
      setState: (partial: Record<string, any>) => {
        Object.assign(mockState, partial);
      },
    }
  ),
}));

const mockState: Record<string, any> = {
  searchQuery: '',
  setSearchQuery: jest.fn(),
};

import SearchBar from '../components/SearchBar';

beforeEach(() => {
  jest.clearAllMocks();
  mockState.searchQuery = '';
  mockState.setSearchQuery = jest.fn();
});

describe('SearchBar', () => {
  it('renders search input with placeholder', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('search.placeholder')).toBeTruthy();
  });

  it('calls setSearchQuery after debounce on text change', () => {
    jest.useFakeTimers();
    render(<SearchBar />);

    const input = screen.getByPlaceholderText('search.placeholder');
    fireEvent.changeText(input, 'hello');

    // Not called immediately
    expect(mockState.setSearchQuery).not.toHaveBeenCalled();

    // Called after 300ms debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(mockState.setSearchQuery).toHaveBeenCalledWith('hello');

    jest.useRealTimers();
  });

  it('shows clear button when text exists', () => {
    mockState.searchQuery = 'test query';
    render(<SearchBar />);
    expect(screen.getByText('x')).toBeTruthy();
  });

  it('hides clear button when text is empty', () => {
    mockState.searchQuery = '';
    render(<SearchBar />);
    expect(screen.queryByText('x')).toBeNull();
  });

  it('clear button resets text and calls setSearchQuery', () => {
    jest.useFakeTimers();
    mockState.searchQuery = 'existing';
    render(<SearchBar />);

    const clearButton = screen.getByText('x');
    fireEvent.press(clearButton);

    expect(mockState.setSearchQuery).toHaveBeenCalledWith('');
    expect(screen.getByPlaceholderText('search.placeholder').props.value).toBe('');

    jest.useRealTimers();
  });

  it('cancels debounce timer on clear', () => {
    jest.useFakeTimers();
    render(<SearchBar />);

    const input = screen.getByPlaceholderText('search.placeholder');
    fireEvent.changeText(input, 'typing');

    // Clear before debounce fires
    const clearButton = screen.getByText('x');
    fireEvent.press(clearButton);

    // Advance past debounce — should not call setSearchQuery from the timer
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Only the clear call should have happened
    expect(mockState.setSearchQuery).toHaveBeenCalledTimes(1);
    expect(mockState.setSearchQuery).toHaveBeenCalledWith('');

    jest.useRealTimers();
  });
});
