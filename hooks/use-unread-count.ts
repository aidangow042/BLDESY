/**
 * Hook to track total unread message count with real-time updates.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getTotalUnreadCount } from '@/lib/messaging';

export function useUnreadCount(userId: string | null) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const total = await getTotalUnreadCount();
    setCount(total);
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time updates via Supabase
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('unread-count')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.user1_id === userId || row.user2_id === userId) {
            refresh();
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.user1_id === userId || row.user2_id === userId) {
            refresh();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { count, refresh };
}
