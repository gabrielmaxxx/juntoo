import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [conversations, setConversations] = useState<EventConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchConversations = useCallback(async () => {
    if (!user) { setConversations([]); setLoading(false); return; }

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

    const lastMsgMap = new Map<string, typeof allMessages[0]>();
    const unreadMap = new Map<string, number>();

    for (const msg of allMessages) {
      if (!lastMsgMap.has(msg.event_id)) {
        lastMsgMap.set(msg.event_id, msg);
      }
      if (msg.user_id !== user.id) {
        const lastReadAt = readMap.get(msg.event_id);
        if (!lastReadAt || new Date(msg.created_at) > new Date(lastReadAt)) {
          unreadMap.set(msg.event_id, (unreadMap.get(msg.event_id) || 0) + 1);
        }
      }
    }

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

  // Listen for cache invalidation from CacheManager instead of own channel
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && event.query?.queryKey?.[0] === 'unread-counts') {
        fetchConversations();
      }
    });

    return () => unsubscribe();
  }, [user, fetchConversations, queryClient]);

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
