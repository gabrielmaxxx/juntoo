import { useState, useEffect, useCallback } from 'react';
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

  const fetchConversations = useCallback(async () => {
    if (!user) { setConversations([]); setLoading(false); return; }

    // Get events the user participates in
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

    // Fetch event details
    const { data: events } = await supabase
      .from('events')
      .select('id, title, image_url')
      .in('id', eventIds);

    // Fetch read states
    const { data: readStates } = await supabase
      .from('event_message_reads')
      .select('event_id, last_read_at')
      .eq('user_id', user.id)
      .in('event_id', eventIds);

    const readMap = new Map(readStates?.map(r => [r.event_id, r.last_read_at]) || []);

    const results: EventConversation[] = [];

    // For each event, get last message and unread count
    for (const event of events || []) {
      // Last message
      const { data: lastMsg } = await supabase
        .from('event_messages')
        .select('message, created_at, user_id, profiles:user_id(full_name)')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastMsg) continue; // Skip events with no messages

      const lastReadAt = readMap.get(event.id);

      // Unread count
      let unreadCount = 0;
      if (lastReadAt) {
        const { count } = await supabase
          .from('event_messages')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .gt('created_at', lastReadAt)
          .neq('user_id', user.id);
        unreadCount = count || 0;
      } else {
        // Never read — count all messages from others
        const { count } = await supabase
          .from('event_messages')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .neq('user_id', user.id);
        unreadCount = count || 0;
      }

      const senderProfile = lastMsg.profiles as any;

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

  // Subscribe to new event messages for realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('event-messages-inbox')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_messages',
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
