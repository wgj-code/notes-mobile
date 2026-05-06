import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RegisterScreen from '../screens/RegisterScreen';

const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack };

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector: any) => selector({
    signUp: jest.fn(),
  }),
}));

jest.mock('../lib/supabase-helpers', () => ({
  mapSupabaseError: jest.fn(),
  getUserMessage: jest.fn(),
}));

describe('RegisterScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('renders all input fields', () => {
    render(<RegisterScreen navigation={mockNavigation} />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeTruthy();
  });

  it('renders register button', () => {
    render(<RegisterScreen navigation={mockNavigation} />);
    expect(screen.getByText('Register')).toBeTruthy();
  });

  it('renders login link', () => {
    render(<RegisterScreen navigation={mockNavigation} />);
    expect(screen.getByText('Already have an account? Login')).toBeTruthy();
  });

  it('navigates back when login link pressed', () => {
    render(<RegisterScreen navigation={mockNavigation} />);
    fireEvent.press(screen.getByText('Already have an account? Login'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders create account title', () => {
    render(<RegisterScreen navigation={mockNavigation} />);
    expect(screen.getByText('Create Account')).toBeTruthy();
  });
});
