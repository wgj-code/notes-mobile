/**
 * v12-folders.test.tsx — Tests for FolderTree component.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock i18n before any imports that use it
jest.mock('../i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'folder.allNotes': 'All Notes',
      'folder.uncategorized': 'Uncategorized',
      'folder.newFolder': 'New Folder',
      'folder.folderName': 'Folder name',
      'folder.delete': 'Delete Folder',
      'folder.confirmDelete': 'Delete folder "{{name}}"?',
      'folder.createFailed': 'Failed to create folder',
      'folder.deleteFailed': 'Failed to delete folder',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.save': 'Save',
      'common.error': 'Error',
    };
    return map[key] ?? key;
  },
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
  folders: [],
  selectedFolderId: null,
  setSelectedFolderId: jest.fn(),
  createFolder: jest.fn().mockResolvedValue(undefined),
  deleteFolder: jest.fn().mockResolvedValue(undefined),
};

import FolderTree from '../components/FolderTree';

beforeEach(() => {
  jest.clearAllMocks();
  mockState.folders = [];
  mockState.selectedFolderId = null;
  mockState.setSelectedFolderId = jest.fn();
  mockState.createFolder = jest.fn().mockResolvedValue(undefined);
  mockState.deleteFolder = jest.fn().mockResolvedValue(undefined);
});

describe('FolderTree', () => {
  it('renders "All Notes" and "Uncategorized" options', () => {
    render(<FolderTree />);
    expect(screen.getByText('All Notes')).toBeTruthy();
    expect(screen.getByText('Uncategorized')).toBeTruthy();
  });

  it('renders user folders', () => {
    mockState.folders = [
      { id: 'f1', name: 'Work', user_id: 'u1', parent_id: null, created_at: '', updated_at: '' },
      { id: 'f2', name: 'Personal', user_id: 'u1', parent_id: null, created_at: '', updated_at: '' },
    ];
    render(<FolderTree />);
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();
  });

  it('calls setSelectedFolderId(null) when tapping "All Notes"', () => {
    render(<FolderTree />);
    fireEvent.press(screen.getByText('All Notes'));
    expect(mockState.setSelectedFolderId).toHaveBeenCalledWith(null);
  });

  it('calls setSelectedFolderId("__uncategorized") when tapping "Uncategorized"', () => {
    render(<FolderTree />);
    fireEvent.press(screen.getByText('Uncategorized'));
    expect(mockState.setSelectedFolderId).toHaveBeenCalledWith('__uncategorized');
  });

  it('calls setSelectedFolderId with folder id when tapping a folder', () => {
    mockState.folders = [
      { id: 'f1', name: 'Work', user_id: 'u1', parent_id: null, created_at: '', updated_at: '' },
    ];
    render(<FolderTree />);
    fireEvent.press(screen.getByText('Work'));
    expect(mockState.setSelectedFolderId).toHaveBeenCalledWith('f1');
  });

  it('calls onFolderSelect callback when provided', () => {
    const onFolderSelect = jest.fn();
    render(<FolderTree onFolderSelect={onFolderSelect} />);
    fireEvent.press(screen.getByText('All Notes'));
    expect(onFolderSelect).toHaveBeenCalledTimes(1);
  });

  it('renders nested folders with indentation', () => {
    mockState.folders = [
      { id: 'f1', name: 'Work', user_id: 'u1', parent_id: null, created_at: '', updated_at: '' },
      { id: 'f2', name: 'Projects', user_id: 'u1', parent_id: 'f1', created_at: '', updated_at: '' },
    ];
    render(<FolderTree />);
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('shows "New Folder" button', () => {
    render(<FolderTree />);
    expect(screen.getByText('+ New Folder')).toBeTruthy();
  });

  it('renders empty state with no folders', () => {
    render(<FolderTree />);
    expect(screen.getByText('All Notes')).toBeTruthy();
    expect(screen.getByText('Uncategorized')).toBeTruthy();
    expect(screen.queryByText('Work')).toBeNull();
  });
});
