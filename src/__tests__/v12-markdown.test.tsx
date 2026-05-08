/**
 * v12-markdown.test.tsx — Tests for MarkdownEditor and MarkdownPreview components.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Mock react-native-markdown-display
jest.mock('react-native-markdown-display', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: string }) => React.createElement(Text, null, children),
  };
});

import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownPreview from '../components/MarkdownPreview';

describe('MarkdownEditor', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    placeholder: 'Write something...',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders TextInput with placeholder', () => {
    render(<MarkdownEditor {...defaultProps} />);
    expect(screen.getByPlaceholderText('Write something...')).toBeTruthy();
  });

  it('displays the current value in the input', () => {
    render(<MarkdownEditor {...defaultProps} value="Hello world" />);
    const input = screen.getByPlaceholderText('Write something...');
    expect(input.props.value).toBe('Hello world');
  });

  it('calls onChangeText when text is typed', () => {
    const onChangeText = jest.fn();
    render(<MarkdownEditor {...defaultProps} onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByPlaceholderText('Write something...'), 'new text');
    expect(onChangeText).toHaveBeenCalledWith('new text');
  });

  it('renders toolbar buttons for bold, italic, link, and list', () => {
    render(<MarkdownEditor {...defaultProps} />);
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getByText('I')).toBeTruthy();
    expect(screen.getByText('[]')).toBeTruthy();
    expect(screen.getByText('-')).toBeTruthy();
  });

  it('shows character count in footer', () => {
    render(<MarkdownEditor {...defaultProps} value="abc" />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows 0 character count when empty', () => {
    render(<MarkdownEditor {...defaultProps} value="" />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('bold button appends markdown wrappers', () => {
    const onChangeText = jest.fn();
    render(<MarkdownEditor {...defaultProps} value="Hello" onChangeText={onChangeText} />);
    fireEvent.press(screen.getByText('B'));
    expect(onChangeText).toHaveBeenCalledWith('Hello****');
  });

  it('italic button appends markdown wrappers', () => {
    const onChangeText = jest.fn();
    render(<MarkdownEditor {...defaultProps} value="Hello" onChangeText={onChangeText} />);
    fireEvent.press(screen.getByText('I'));
    expect(onChangeText).toHaveBeenCalledWith('Hello**');
  });

  it('list button appends prefix', () => {
    const onChangeText = jest.fn();
    render(<MarkdownEditor {...defaultProps} value="Hello" onChangeText={onChangeText} />);
    fireEvent.press(screen.getByText('-'));
    expect(onChangeText).toHaveBeenCalledWith('Hello\n- ');
  });
});

describe('MarkdownPreview', () => {
  it('renders markdown content', () => {
    render(<MarkdownPreview content="# Hello World" />);
    expect(screen.getByText('# Hello World')).toBeTruthy();
  });

  it('renders plain text content', () => {
    render(<MarkdownPreview content="Just some plain text" />);
    expect(screen.getByText('Just some plain text')).toBeTruthy();
  });

  it('renders markdown with formatting', () => {
    render(<MarkdownPreview content="**bold** and *italic*" />);
    expect(screen.getByText('**bold** and *italic*')).toBeTruthy();
  });
});
