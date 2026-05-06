/**
 * authStore.test.ts — Unit tests for the auth Zustand store.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock supabase before any imports
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ session: null, loading: true });
});

describe('authStore', () => {
  describe('signIn', () => {
    it('sets session on success', async () => {
      const fakeSession = { user: { id: 'u1' }, access_token: 'tok' };
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: fakeSession } });

      await useAuthStore.getState().signIn('a@b.com', 'pass');
      expect(useAuthStore.getState().session).toEqual(fakeSession);
    });

    it('throws on failure', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      await expect(useAuthStore.getState().signIn('a@b.com', 'wrong')).rejects.toBeDefined();
    });
  });

  describe('signUp', () => {
    it('sets session on success', async () => {
      const fakeSession = { user: { id: 'u2' }, access_token: 'tok2' };
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({ error: null });
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: fakeSession } });

      await useAuthStore.getState().signUp('a@b.com', 'pass');
      expect(useAuthStore.getState().session).toEqual(fakeSession);
    });

    it('throws on failure', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        error: { message: 'already registered' },
      });

      await expect(useAuthStore.getState().signUp('a@b.com', 'pass')).rejects.toBeDefined();
    });
  });

  describe('signOut', () => {
    it('clears session', async () => {
      useAuthStore.setState({ session: { user: { id: 'u1' } } as any });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await useAuthStore.getState().signOut();
      expect(useAuthStore.getState().session).toBeNull();
    });
  });

  describe('init', () => {
    it('loads session and sets loading false', async () => {
      const fakeSession = { user: { id: 'u1' } };
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: fakeSession } });
      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      await useAuthStore.getState().init();
      expect(useAuthStore.getState().session).toEqual(fakeSession);
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('sets null session when not authenticated', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      await useAuthStore.getState().init();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('registers auth state change listener', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      await useAuthStore.getState().init();
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });
});
