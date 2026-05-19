/**
 * FeedbackButton.test.tsx -- Unit tests for the feedback floating action button.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../contexts/ThemeContext', () => ({
  useThemeColors: () => ({
    textSecondary: '#666666',
  }),
}));

jest.mock('../lib/theme', () => ({
  borderRadius: { lg: 16 },
}));

jest.mock('../i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'feedback.title': 'Feedback',
    };
    return map[key] || key;
  },
}));

import FeedbackButton from '../components/FeedbackButton';

describe('FeedbackButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(async () => {
    mockOnPress.mockClear();
    await AsyncStorage.clear();
  });

  it('renders floating button', async () => {
    render(<FeedbackButton onPress={mockOnPress} />);
    expect(await screen.findByText('?')).toBeTruthy();
  });

  it('renders close button', async () => {
    render(<FeedbackButton onPress={mockOnPress} />);
    expect(await screen.findByText('x')).toBeTruthy();
  });

  it('calls onPress when FAB is pressed', async () => {
    render(<FeedbackButton onPress={mockOnPress} />);
    await screen.findByText('?');
    fireEvent.press(screen.getByText('?'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('hides button when close is pressed', async () => {
    render(<FeedbackButton onPress={mockOnPress} />);
    await screen.findByText('x');
    fireEvent.press(screen.getByText('x'));
    await waitFor(() => {
      expect(screen.queryByText('?')).toBeNull();
    });
    expect(screen.queryByText('x')).toBeNull();
  });

  it('is hidden when previously dismissed via AsyncStorage', async () => {
    await AsyncStorage.setItem('feedback-button-hidden', 'true');
    render(<FeedbackButton onPress={mockOnPress} />);
    await waitFor(() => {
      expect(screen.queryByText('?')).toBeNull();
    });
  });
});
