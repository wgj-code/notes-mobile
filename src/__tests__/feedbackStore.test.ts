/**
 * feedbackStore.test.ts -- Unit tests for the feedback Zustand store.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock supabase before any imports
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
    },
  },
}));

// Mock expo-file-system (submitFeedback reads files for upload)
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64content'),
  EncodingType: { Base64: 'base64' },
}));

import { useFeedbackStore } from '../stores/feedbackStore';
import { supabase } from '../lib/supabase';

const mockFeedback = {
  id: 'fb1',
  user_id: 'u1',
  content: 'Great app!',
  category: 'feature' as const,
  images: [],
  voice_url: null,
  status: 'new' as const,
  created_at: '2026-05-18T00:00:00Z',
  updated_at: '2026-05-18T00:00:00Z',
};

function makeQuery(overrides: Record<string, any> = {}) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useFeedbackStore.setState({
    feedbackList: [],
    loading: false,
    submitting: false,
    error: null,
  });
});

describe('feedbackStore', () => {
  describe('initial state', () => {
    it('starts with empty feedback array', () => {
      expect(useFeedbackStore.getState().feedbackList).toEqual([]);
      expect(useFeedbackStore.getState().loading).toBe(false);
      expect(useFeedbackStore.getState().submitting).toBe(false);
      expect(useFeedbackStore.getState().error).toBeNull();
    });
  });

  describe('fetchMyFeedback', () => {
    it('calls supabase and sets state on success', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'u1' } },
      });
      const q = makeQuery({
        order: jest.fn().mockResolvedValue({ data: [mockFeedback], error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useFeedbackStore.getState().fetchMyFeedback();

      expect(supabase.from).toHaveBeenCalledWith('feedback');
      expect(q.select).toHaveBeenCalledWith('*');
      expect(q.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(useFeedbackStore.getState().feedbackList).toEqual([mockFeedback]);
      expect(useFeedbackStore.getState().loading).toBe(false);
    });

    it('returns early with empty list when user is not logged in', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      await useFeedbackStore.getState().fetchMyFeedback();

      expect(supabase.from).not.toHaveBeenCalled();
      expect(useFeedbackStore.getState().feedbackList).toEqual([]);
      expect(useFeedbackStore.getState().loading).toBe(false);
    });

    it('sets error state on supabase query failure', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'u1' } },
      });
      const q = makeQuery({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useFeedbackStore.getState().fetchMyFeedback();

      expect(useFeedbackStore.getState().error).toBe('DB error');
      expect(useFeedbackStore.getState().loading).toBe(false);
    });

    it('sets error state on network exception', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await useFeedbackStore.getState().fetchMyFeedback();

      expect(useFeedbackStore.getState().error).toBe('Network error');
      expect(useFeedbackStore.getState().loading).toBe(false);
    });
  });

  describe('submitFeedback', () => {
    it('inserts feedback record and prepends to local list', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'u1' } },
      });
      // No images, no voice
      const q = makeQuery({
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockFeedback, error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useFeedbackStore.getState().submitFeedback({
        content: 'Great app!',
        category: 'feature',
        images: [],
        voiceUri: null,
      });

      expect(q.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          content: 'Great app!',
          category: 'feature',
          images: [],
          voice_url: null,
        })
      );
      expect(useFeedbackStore.getState().feedbackList).toEqual([mockFeedback]);
      expect(useFeedbackStore.getState().submitting).toBe(false);
    });

    it('saves locally when user is not logged in (offline fallback)', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      await useFeedbackStore.getState().submitFeedback({
        content: 'Offline feedback',
        category: 'bug',
        images: [],
        voiceUri: null,
      });

      expect(useFeedbackStore.getState().feedbackList).toHaveLength(1);
      expect(useFeedbackStore.getState().feedbackList[0].content).toBe('Offline feedback');
      expect(useFeedbackStore.getState().feedbackList[0].category).toBe('bug');
      expect(useFeedbackStore.getState().submitting).toBe(false);
    });

    it('saves locally when insert fails (network error fallback)', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'u1' } },
      });
      const q = makeQuery({
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useFeedbackStore.getState().submitFeedback({
        content: 'Saved offline',
        category: 'other',
        images: [],
        voiceUri: null,
      });

      expect(useFeedbackStore.getState().feedbackList).toHaveLength(1);
      expect(useFeedbackStore.getState().feedbackList[0].content).toBe('Saved offline');
      expect(useFeedbackStore.getState().error).toBeNull();
      expect(useFeedbackStore.getState().submitting).toBe(false);
    });

    it('clears previous error before submitting', async () => {
      useFeedbackStore.setState({ error: 'old error' });
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'u1' } },
      });
      const q = makeQuery({
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockFeedback, error: null }),
      });
      (supabase.from as jest.Mock).mockReturnValue(q);

      await useFeedbackStore.getState().submitFeedback({
        content: 'test',
        category: 'improvement',
        images: [],
        voiceUri: null,
      });

      expect(useFeedbackStore.getState().error).toBeNull();
    });
  });
});
