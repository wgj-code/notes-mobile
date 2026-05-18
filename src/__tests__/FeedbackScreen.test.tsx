import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FeedbackScreen from '../screens/FeedbackScreen';

const mockFetchMyFeedback = jest.fn();
const mockSubmitFeedback = jest.fn();

const mockState = {
  feedbackList: [],
  loading: false,
  submitting: false,
  fetchMyFeedback: mockFetchMyFeedback,
  submitFeedback: mockSubmitFeedback,
};

jest.mock('../stores/feedbackStore', () => ({
  useFeedbackStore: (selector?: any) => (selector ? selector(mockState) : mockState),
}));

describe('FeedbackScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockState.feedbackList = [];
    mockState.loading = false;
    mockState.submitting = false;
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it('renders the feedback form', () => {
    render(<FeedbackScreen />);
    expect(screen.getByPlaceholderText('Tell us what you think...')).toBeTruthy();
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('renders tab bar with Submit and History tabs', () => {
    render(<FeedbackScreen />);
    expect(screen.getByText('Submit Feedback')).toBeTruthy();
    expect(screen.getByText('My Feedback')).toBeTruthy();
  });

  it('renders category picker', () => {
    render(<FeedbackScreen />);
    expect(screen.getByText('Bug')).toBeTruthy();
    expect(screen.getByText('Feature')).toBeTruthy();
    expect(screen.getByText('Improvement')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('shows error when submitting empty feedback', () => {
    render(<FeedbackScreen />);
    fireEvent.press(screen.getByText('Submit'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Please enter a description'
    );
  });

  it('calls submitFeedback on form submit with content', async () => {
    mockSubmitFeedback.mockResolvedValueOnce(undefined);
    render(<FeedbackScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Tell us what you think...'),
      'Great app!'
    );
    fireEvent.press(screen.getByText('Submit'));

    expect(mockSubmitFeedback).toHaveBeenCalledWith({
      content: 'Great app!',
      category: 'other',
      images: [],
      voiceUri: null,
    });
  });

  it('switches to history tab', () => {
    render(<FeedbackScreen />);
    fireEvent.press(screen.getByText('My Feedback'));
    // After switching to history, the form description input should not be visible
    expect(screen.queryByPlaceholderText('Tell us what you think...')).toBeNull();
  });

  it('shows empty state when no feedback history', () => {
    render(<FeedbackScreen />);
    fireEvent.press(screen.getByText('My Feedback'));
    expect(screen.getByText('No feedback yet')).toBeTruthy();
  });
});
