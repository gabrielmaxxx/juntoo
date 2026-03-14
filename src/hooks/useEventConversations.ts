import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EventConversation {
  type: 'event';
  event_id: string;
  event_title: string;
  event_image: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_sender: string | null;
  unread_count: number;
}

export function useEventConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<EventConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) { setConversations([]); setLoading(false); return; }

    // 1. Get events the user participates in
    const { data: participations } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', user.id);

    if (!participations || participations.length === 0) {
      setConversations([]);
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    const eventIds = participations.map(p => p.event_id);

    // 2. Batch: fetch events, read states, and ALL messages in parallel
    const [eventsRes, readStatesRes, allMessagesRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, title, image_url')
        .in('id', eventIds),
      supabase
        .from('event_message_reads')
        .select('event_id, last_read_at')
        .eq('user_id', user.id)
        .in('event_id', eventIds),
      supabase
        .from('event_messages')
        .select('event_id, message, created_at, user_id, profiles:user_id(full_name)')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const events = eventsRes.data || [];
    const readMap = new Map(readStatesRes.data?.map(r => [r.event_id, r.last_read_at]) || []);
    const allMessages = allMessagesRes.data || [];

    // 3. Client-side: pick last message per event and compute unread counts
    const lastMsgMap = new Map<string, typeof allMessages[0]>();
    const unreadMap = new Map<string, number>();

    for (const msg of allMessages) {
      // Track last message per event
      if (!lastMsgMap.has(msg.event_id)) {
        lastMsgMap.set(msg.event_id, msg);
      }

      // Count unreads: messages from others after last_read_at
      if (msg.user_id !== user.id) {
        const lastReadAt = readMap.get(msg.event_id);
        if (!lastReadAt || new Date(msg.created_at) > new Date(lastReadAt)) {
          unreadMap.set(msg.event_id, (unreadMap.get(msg.event_id) || 0) + 1);
        }
      }
    }

    // 4. Build results (only events with messages)
    const results: EventConversation[] = [];

    for (const event of events) {
      const lastMsg = lastMsgMap.get(event.id);
      if (!lastMsg) continue;

      const senderProfile = lastMsg.profiles as any;
      const unreadCount = unreadMap.get(event.id) || 0;

      results.push({
        type: 'event',
        event_id: event.id,
        event_title: event.title,
        event_image: event.image_url,
        last_message: lastMsg.message,
        last_message_at: lastMsg.created_at,
        last_message_sender: senderProfile?.full_name || null,
        unread_count: unreadCount,
      });
    }

    results.sort((a, b) => {
      const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return tb - ta;
    });

    setConversations(results);
    setTotalUnread(results.reduce((sum, c) => sum + c.unread_count, 0));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Debounced realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('event-messages-inbox')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_messages',
      }, () => {
        // Debounce: wait 2s before refetching
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          fetchConversations();
        }, 2000);
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return { conversations, loading, totalUnread, refresh: fetchConversations };
}

export async function markEventMessagesRead(userId: string, eventId: string) {
  await supabase
    .from('event_message_reads')
    .upsert(
      { user_id: userId, event_id: eventId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,event_id' }
    );
}
