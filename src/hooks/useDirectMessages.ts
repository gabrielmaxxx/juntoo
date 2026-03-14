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
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', otherUserIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Get last message and unread count per conversation
    const convList: Conversation[] = [];
    
    for (const convId of convIds) {
      const otherP = otherParticipants.find(p => p.conversation_id === convId);
      if (!otherP) continue;
      const profile = profileMap.get(otherP.user_id);
      if (!profile) continue;

      const { data: lastMsg } = await supabase
        .from('direct_messages')
        .select('content, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { count: unread } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', convId)
        .eq('read', false)
        .neq('sender_id', user.id);

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
        unread_count: unread || 0,
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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dm-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, () => {
        loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadConversations]);

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
        // Only add if from another user (our own messages are added optimistically)
        if (user && newMsg.sender_id === user.id) return;
        setMessages(prev => {
          // Deduplicate by id
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Mark as read
        if (user && newMsg.sender_id !== user.id) {
          supabase.from('direct_messages').update({ read: true }).eq('id', newMsg.id).then();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !user || !content.trim()) return;
    // Optimistic update
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
      console.error(error);
    }
  };

  return { messages, loading, sendMessage };
}
