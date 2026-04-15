/**
 * Hook de chat por evento — Supabase Realtime com presença e digitação.
 *
 * Gerencia:
 *  - Mensagens com paginação inicial + realtime
 *  - Optimistic UI para envio
 *  - Indicadores de presença (quem está online)
 *  - Indicadores de digitação
 *  - Marcação de leitura automática
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { markEventMessagesRead } from '@/hooks/useEventConversations';
import { haptic } from '@/lib/haptics';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  event_id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_deleted?: boolean;
  /** Optimistic status */
  status: 'sending' | 'sent' | 'delivered';
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface ChatPresenceUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface MessageGroup {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  messages: ChatMessage[];
  isCurrentUser: boolean;
  isSystem: boolean;
}

// ─── Constants ────────────────────────────────────────────

const RATE_LIMIT_MS = 1500;
const RATE_LIMIT_BURST = 5;
const RATE_LIMIT_WINDOW = 10_000;
const GROUP_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

// ─── Relative time formatter ─────────────────────────────

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  if (diff < 60_000) return 'agora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min atrás`;
  if (diff < 86_400_000) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (new Date(dateStr).toDateString() === yesterday.toDateString()) {
    return `ontem às ${new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Group messages ──────────────────────────────────────

export function groupMessages(
  messages: ChatMessage[],
  currentUserId: string | undefined
): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const msg of messages) {
    const lastGroup = groups[groups.length - 1];
    const timeDiff = lastGroup
      ? new Date(msg.created_at).getTime() -
        new Date(
          lastGroup.messages[lastGroup.messages.length - 1].created_at
        ).getTime()
      : Infinity;

    const isSystem = msg.user_id === 'system';

    if (lastGroup && lastGroup.userId === msg.user_id && timeDiff < GROUP_THRESHOLD_MS && !isSystem) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({
        userId: msg.user_id,
        userName: msg.profiles?.full_name || 'Usuário',
        avatarUrl: msg.profiles?.avatar_url || null,
        messages: [msg],
        isCurrentUser: msg.user_id === currentUserId,
        isSystem,
      });
    }
  }

  return groups;
}

// ─── Hook ────────────────────────────────────────────────

export function useEventChat(eventId: string, isParticipating: boolean) {
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<ChatPresenceUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<ChatPresenceUser[]>([]);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  // Rate limiting
  const lastSentAt = useRef(0);
  const recentSends = useRef<number[]>([]);
  const [rateLimited, setRateLimited] = useState(false);

  // Typing debounce
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Profiles cache
  const profilesCache = useRef(new Map<string, { full_name: string; avatar_url: string | null }>());

  // ── Fetch initial messages ──────────────────────────────

  const fetchMessages = useCallback(async () => {
    if (!isParticipating) return;
    setLoading(true);

    try {
      const { data: messagesData, error } = await supabase
        .from('event_messages')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      if (!messagesData?.length) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Batch fetch profiles
      const userIds = [...new Set(messagesData.map((m) => m.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      for (const p of profilesData || []) {
        profilesCache.current.set(p.user_id, {
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        });
      }

      const mapped: ChatMessage[] = messagesData.map((msg) => ({
        id: msg.id,
        event_id: msg.event_id,
        user_id: msg.user_id,
        message: msg.message,
        created_at: msg.created_at,
        status: 'delivered' as const,
        profiles: profilesCache.current.get(msg.user_id) || {
          full_name: 'Usuário',
          avatar_url: null,
        },
      }));

      setMessages(mapped);

      if (user) {
        markEventMessagesRead(user.id, eventId);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, isParticipating, user]);

  // ── Realtime subscription ───────────────────────────────

  useEffect(() => {
    if (!isParticipating || !user) return;

    fetchMessages();

    const channel = supabase.channel(`event-chat-${eventId}`, {
      config: { presence: { key: user.id } },
    });

    // Presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{
        user_id: string;
        full_name: string;
        avatar_url: string | null;
        is_typing: boolean;
      }>();

      const online: ChatPresenceUser[] = [];
      const typing: ChatPresenceUser[] = [];

      for (const [, presences] of Object.entries(state)) {
        for (const p of presences) {
          if (p.user_id !== user.id) {
            online.push({
              user_id: p.user_id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
            });
            if (p.is_typing) {
              typing.push({
                user_id: p.user_id,
                full_name: p.full_name,
                avatar_url: p.avatar_url,
              });
            }
          }
        }
      }

      setOnlineUsers(online);
      setTypingUsers(typing);
    });

    // New messages via postgres_changes
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'event_messages',
        filter: `event_id=eq.${eventId}`,
      },
      async (payload) => {
        const newMsg = payload.new as {
          id: string;
          event_id: string;
          user_id: string;
          message: string;
          created_at: string;
        };

        // Fetch profile if not cached
        if (!profilesCache.current.has(newMsg.user_id)) {
          const { data } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .eq('user_id', newMsg.user_id)
            .single();
          if (data) {
            profilesCache.current.set(data.user_id, {
              full_name: data.full_name,
              avatar_url: data.avatar_url,
            });
          }
        }

        const chatMsg: ChatMessage = {
          ...newMsg,
          status: 'delivered',
          profiles: profilesCache.current.get(newMsg.user_id) || {
            full_name: 'Usuário',
            avatar_url: null,
          },
        };

        setMessages((prev) => {
          // Remove matching temp message
          const filtered = prev.filter((m) => {
            if (m.id === newMsg.id) return false;
            if (
              m.id.startsWith('temp-') &&
              m.user_id === newMsg.user_id &&
              m.message === newMsg.message
            )
              return false;
            return true;
          });
          return [...filtered, chatMsg];
        });

        if (user) {
          markEventMessagesRead(user.id, eventId);
        }
      }
    );

    // Deleted messages
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'event_messages',
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        const deletedId = (payload.old as any).id;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === deletedId
              ? { ...m, message: '[Mensagem removida]', is_deleted: true }
              : m
          )
        );
      }
    );

    // Track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          full_name: profile?.full_name || 'Usuário',
          avatar_url: profile?.avatar_url || null,
          is_typing: false,
        });
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [eventId, isParticipating, user, profile]);

  // ── Send message ────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!user || !text.trim()) return;

      const now = Date.now();

      // Rate limit check
      if (now - lastSentAt.current < RATE_LIMIT_MS) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), RATE_LIMIT_MS);
        return;
      }
      const recent = recentSends.current.filter(
        (t) => now - t < RATE_LIMIT_WINDOW
      );
      if (recent.length >= RATE_LIMIT_BURST) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 3000);
        return;
      }

      lastSentAt.current = now;
      recentSends.current = [...recent, now];

      const tempId = `temp-${now}`;
      const optimistic: ChatMessage = {
        id: tempId,
        event_id: eventId,
        user_id: user.id,
        message: text.trim(),
        created_at: new Date().toISOString(),
        status: 'sending',
        profiles: {
          full_name: profile?.full_name || 'Você',
          avatar_url: profile?.avatar_url || null,
        },
      };

      setMessages((prev) => [...prev, optimistic]);

      // Stop typing
      if (channelRef.current) {
        channelRef.current.track({
          user_id: user.id,
          full_name: profile?.full_name || 'Usuário',
          avatar_url: profile?.avatar_url || null,
          is_typing: false,
        });
      }

      try {
        const { error } = await supabase.from('event_messages').insert({
          event_id: eventId,
          user_id: user.id,
          message: text.trim(),
        });

        if (error) throw error;

        // Mark as sent (realtime will upgrade to delivered)
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
        );
      } catch (err) {
        console.error('Error sending message:', err);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error('Não foi possível enviar a mensagem');
        haptic('error');
      }
    },
    [user, profile, eventId]
  );

  // ── Typing indicator ───────────────────────────────────

  const notifyTyping = useCallback(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.track({
      user_id: user.id,
      full_name: profile?.full_name || 'Usuário',
      avatar_url: profile?.avatar_url || null,
      is_typing: true,
    });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      channelRef.current?.track({
        user_id: user.id,
        full_name: profile?.full_name || 'Usuário',
        avatar_url: profile?.avatar_url || null,
        is_typing: false,
      });
    }, 3000);
  }, [user, profile]);

  // ── Delete message ──────────────────────────────────────

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!user) return;

      try {
        const { error } = await supabase
          .from('event_messages')
          .delete()
          .eq('id', messageId)
          .eq('user_id', user.id);

        if (error) throw error;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, message: '[Mensagem removida]', is_deleted: true }
              : m
          )
        );
        haptic('medium');
      } catch {
        toast.error('Não foi possível apagar a mensagem');
      }
    },
    [user]
  );

  // ── Message groups ──────────────────────────────────────

  const messageGroups = useMemo(
    () => groupMessages(messages, user?.id),
    [messages, user?.id]
  );

  return {
    messages,
    messageGroups,
    loading,
    typingUsers,
    onlineUsers,
    rateLimited,
    hasNewBelow,
    setHasNewBelow,
    sendMessage,
    notifyTyping,
    deleteMessage,
    refetch: fetchMessages,
  };
}
