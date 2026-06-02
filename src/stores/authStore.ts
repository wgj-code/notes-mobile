import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

interface AuthState {
  session: Session | null;
  loading: boolean;
  authChecked: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  authChecked: false,

  signIn: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });
    } catch (err: any) {
      logger.error('authStore', 'signIn failed', err, { email });
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        throw new Error('需要网络才能登录，请检查网络连接后重试');
      }
      throw err;
    }
  },

  signUp: async (email, password) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });
    } catch (err: any) {
      logger.error('authStore', 'signUp failed', err, { email });
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        throw new Error('需要网络才能注册，请检查网络连接后重试');
      }
      throw err;
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Offline: clear local session anyway
    }
    set({ session: null });
  },

  init: async () => {
    // Immediately render the app — don't block on auth check
    set({ loading: false });

    // Check auth in background (non-blocking)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, authChecked: true });
    } catch {
      // Offline: proceed without session, app shows cached data or login
      set({ authChecked: true });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, authChecked: true });
    });
  },
}));
