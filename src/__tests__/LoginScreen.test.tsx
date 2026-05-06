import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector: any) => selector({
    signIn: jest.fn(),
  }),
}));

jest.mock('../lib/supabase-helpers', () => ({
  mapSupabaseError: jest.fn(),
  getUserMessage: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders email and password inputs', () => {
    render(<LoginScreen navigation={mockNavigation} />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('renders login button', () => {
    render(<LoginScreen navigation={mockNavigation} />);
    expect(screen.getByText('Login')).toBeTruthy();
  });

  it('renders register link', () => {
    render(<LoginScreen navigation={mockNavigation} />);
    expect(screen.getByText("Don't have an account? Register")).toBeTruthy();
  });

  it('navigates to register when link pressed', () => {
    render(<LoginScreen navigation={mockNavigation} />);
    fireEvent.press(screen.getByText("Don't have an account? Register"));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('renders welcome title', () => {
    render(<LoginScreen navigation={mockNavigation} />);
    expect(screen.getByText('Welcome Back')).toBeTruthy();
  });
});
