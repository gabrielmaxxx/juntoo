import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Lightweight hook that only computes the total unread event message count.
 * Used in AppHeader to avoid loading full conversation data on every page.
 */
export function useEventUnreadCount() {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!user) { setTotalUnread(0); return; }

    // Get participated event IDs
    const { data: participations } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', user.id);

    if (!participations || participations.length === 0) {
      setTotalUnread(0);
      return;
    }

    const eventIds = participations.map(p => p.event_id);

    // Fetch read states and all other-user messages in parallel
    const [readRes, msgsRes] = await Promise.all([
      supabase
        .from('event_message_reads')
        .select('event_id, last_read_at')
        .eq('user_id', user.id)
        .in('event_id', eventIds),
      supabase
        .from('event_messages')
        .select('event_id, created_at, user_id')
        .in('event_id', eventIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const readMap = new Map(readRes.data?.map(r => [r.event_id, r.last_read_at]) || []);
    let count = 0;

    for (const msg of msgsRes.data || []) {
      const lastReadAt = readMap.get(msg.event_id);
      if (!lastReadAt || new Date(msg.created_at) > new Date(lastReadAt)) {
        count++;
      }
    }

    setTotalUnread(count);
  }, [user]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('event-unread-count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_messages',
      }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchCount, 2000);
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount]);

  return { totalUnread };
}
