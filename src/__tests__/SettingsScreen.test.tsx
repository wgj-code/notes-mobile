import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../screens/SettingsScreen';

const mockSignOut = jest.fn();
const mockAuthState = {
  session: { user: { email: 'test@example.com' } },
  signOut: mockSignOut,
};

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector?: any) => selector ? selector(mockAuthState) : mockAuthState,
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
  });

  it('renders user email', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('renders sign out button', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('renders account label', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Account')).toBeTruthy();
  });
});
