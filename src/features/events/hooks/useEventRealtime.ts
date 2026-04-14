/**
 * Hook de Supabase Realtime para um evento específico.
 *
 * Escuta mudanças em:
 *   - event_participants  → invalida detalhe + contadores
 *   - event_messages      → invalida chat
 *   - event_reviews       → invalida avaliações
 *
 * Também escuta notificações do usuário logado e invalida o cache.
 *
 * Uso:
 *   useEventRealtime(eventId);     // dentro de EventDetails
 *   useNotificationsRealtime();    // no layout autenticado
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';

/**
 * Assina mudanças realtime para um evento específico.
 * Invalida os caches relevantes automaticamente.
 */
export const useEventRealtime = (eventId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-realtime-${eventId}`)
      // Participantes: join / leave
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.events.participants(eventId) });
        }
      )
      // Mensagens do chat
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_messages',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.events.messages(eventId) });
        }
      )
      // Reviews
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_reviews',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.events.reviews(eventId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);
};

/**
 * Assina notificações do usuário logado via Realtime.
 * Invalida contadores de não-lidos e a lista de notificações.
 */
export const useNotificationsRealtime = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
};
