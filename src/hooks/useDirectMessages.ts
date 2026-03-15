import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  };
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    
    // Get all conversations the user participates in
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participations?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participations.map(p => p.conversation_id);

    // Get other participants with profiles
    const { data: otherParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)
      .neq('user_id', user.id);

    if (!otherParticipants?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const otherUserIds = [...new Set(otherParticipants.map(p => p.user_id))];

    // Fetch profiles, all messages, and unread counts in parallel (batch, no N+1)
    const [profilesRes, messagesRes, unreadRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherUserIds),
      supabase
        .from('direct_messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('direct_messages')
        .select('conversation_id', { count: 'exact' })
        .in('conversation_id', convIds)
        .eq('read', false)
        .neq('sender_id', user.id),
    ]);

    const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);

    // Build last message map (first occurrence per conversation = latest)
    const lastMessageMap = new Map<string, { content: string; created_at: string }>();
    for (const msg of messagesRes.data || []) {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, { content: msg.content, created_at: msg.created_at });
      }
    }

    // Build unread count map from individual unread messages
    const unreadCountMap = new Map<string, number>();
    // The query above returns all unread messages - we need per-conversation counts
    // Since we can't group by in supabase-js easily, let's count from individual rows
    if (unreadRes.data) {
      for (const msg of unreadRes.data) {
        unreadCountMap.set(msg.conversation_id, (unreadCountMap.get(msg.conversation_id) || 0) + 1);
      }
    }

    const convList: Conversation[] = [];
    for (const convId of convIds) {
      const otherP = otherParticipants.find(p => p.conversation_id === convId);
      if (!otherP) continue;
      const profile = profileMap.get(otherP.user_id);
      if (!profile) continue;

      const lastMsg = lastMessageMap.get(convId);
      const unread = unreadCountMap.get(convId) || 0;

      convList.push({
        id: convId,
        updated_at: lastMsg?.created_at || '',
        other_user: {
          user_id: otherP.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        },
        last_message: lastMsg?.content || null,
        last_message_at: lastMsg?.created_at || null,
        unread_count: unread,
      });
    }

    convList.sort((a, b) => 
      new Date(b.last_message_at || b.updated_at).getTime() - 
      new Date(a.last_message_at || a.updated_at).getTime()
    );

    setConversations(convList);
    setTotalUnread(convList.reduce((sum, c) => sum + c.unread_count, 0));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // No realtime channel here — CacheManager handles direct_messages changes

  const startConversation = async (otherUserId: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc('find_or_create_conversation', {
      other_user_id: otherUserId,
    });
    if (error) { console.error(error); return null; }
    await loadConversations();
    return data as string;
  };

  return { conversations, loading, totalUnread, startConversation, refresh: loadConversations };
}

export function useChat(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data as DirectMessage[]) || []);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Mark messages as read
  useEffect(() => {
    if (!conversationId || !user) return;
    supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', user.id)
      .then();
  }, [conversationId, user, messages]);

  // Realtime - only add messages from other users (sender uses optimistic update)
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as DirectMessage;
        if (user && newMsg.sender_id === user.id) return;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (user && newMsg.sender_id !== user.id) {
          supabase.from('direct_messages').update({ read: true }).eq('id', newMsg.id).then();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !user || !content.trim()) return;
    const optimisticMsg: DirectMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    const { error } = await supabase.from('direct_messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    });
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      console.error('sendMessage error:', JSON.stringify(error));
    }
  };

  return { messages, loading, sendMessage };
}
