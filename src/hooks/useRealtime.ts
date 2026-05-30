import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  userId: string;
  onNoteChange?: (payload: any) => void;
  onFolderChange?: (payload: any) => void;
}

export function useRealtime({ userId, onNoteChange, onFolderChange }: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const subscribe = () => {
    if (!userId) return;

    // 清理旧订阅
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`realtime:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNoteChange?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onFolderChange?.(payload);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // 监听 App 前后台切换
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        subscribe();
      } else if (state === 'background') {
        unsubscribe();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    // 初始订阅
    subscribe();

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [userId]);

  return { subscribe, unsubscribe };
}
