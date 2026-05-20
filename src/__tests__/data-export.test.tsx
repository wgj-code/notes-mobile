/**
 * data-export.test.tsx — Mobile Data Export (P0)
 *
 * Tests for export button rendering in SettingsScreen, export function invocation,
 * and no-notes message when notes list is empty.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SettingsScreen from '../screens/SettingsScreen';

const mockSignOut = jest.fn();
const mockAuthState = {
  session: { user: { email: 'test@example.com' } },
  signOut: mockSignOut,
};

const mockNotesState = {
  notes: [] as any[],
};

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector?: any) => (selector ? selector(mockAuthState) : mockAuthState),
}));

jest.mock('../stores/notesStore', () => ({
  useNotesStore: (selector?: any) => (selector ? selector(mockNotesState) : mockNotesState),
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

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { version: '1.0.0' },
  },
}));

describe('Data Export (Mobile)', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotesState.notes = [];
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it('renders export button in settings', () => {
    mockNotesState.notes = [
      { id: '1', title: 'Note 1', content: 'c', user_id: 'u1', folder_id: null, tags: [], created_at: '', updated_at: '', deleted_at: null },
    ];

    render(<SettingsScreen />);
    // "Export All Notes" appears twice: as section label + as pressable button
    const exportTexts = screen.getAllByText('Export All Notes');
    expect(exportTexts.length).toBeGreaterThanOrEqual(2);
  });

  it('calls export function when export button is pressed with notes', async () => {
    mockNotesState.notes = [
      { id: '1', title: 'Note One', content: 'Content 1', user_id: 'u1', folder_id: null, tags: [], created_at: '', updated_at: '', deleted_at: null },
      { id: '2', title: 'Note Two', content: 'Content 2', user_id: 'u1', folder_id: null, tags: [], created_at: '', updated_at: '', deleted_at: null },
    ];

    render(<SettingsScreen />);

    // Press the Export All Notes button (second occurrence is the pressable)
    const exportButtons = screen.getAllByText('Export All Notes');
    fireEvent.press(exportButtons[exportButtons.length - 1]);

    // Allow async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    const FileSystem = require('expo-file-system');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
  });

  it('shows no-notes alert when notes list is empty', () => {
    mockNotesState.notes = [];

    render(<SettingsScreen />);

    // The export button text appears as both label and button; press the button
    const exportButtons = screen.getAllByText('Export All Notes');
    fireEvent.press(exportButtons[exportButtons.length - 1]);

    expect(alertSpy).toHaveBeenCalledWith('', 'No notes to export');
  });

  it('export button is visible alongside other settings sections', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getAllByText('Export All Notes').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('About')).toBeTruthy();
  });

  it('export button shows description text', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Export all notes as Markdown files')).toBeTruthy();
  });
});
