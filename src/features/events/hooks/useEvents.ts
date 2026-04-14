/**
 * Hooks de eventos para a feature "events" — arquitetura feature-based.
 *
 * Estes hooks são complementares aos existentes em src/hooks/useEvents.ts.
 * Enquanto os hooks legados focam em listagens de feed (público, trending, amigos),
 * estes fornecem:
 *   - useEventById()      → detalhe de 1 evento com participantes
 *   - useCreateEvent()    → mutation com redirect
 *   - useJoinEvent()      → mutation com optimistic update no contador
 *   - useLeaveEvent()     → mutation com rollback
 *
 * Todos usam queryKeys centralizados para garantir invalidação correta pelo
 * CacheManager / Realtime.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { EVENT_LIST_COLUMNS } from '@/lib/eventColumns';
import type { Event } from '@/types';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';

// ─── Tipos ────────────────────────────────────────────────

type EventRow = Tables<'events'>;
type EventViewRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  date: string;
  time: string;
  location: string;
  city: string | null;
  state: string | null;
  price: number | null;
  max_participants: number | null;
  is_private: boolean | null;
  private_code: string | null;
  is_recurring: boolean | null;
  recurrence_type: string | null;
  recurrence_end_date: string | null;
  parent_event_id: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name: string | null;
  creator_avatar: string | null;
  participants_count: number;
  average_rating: number;
  review_count: number;
};

interface Participant {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────

const transformEvent = (row: EventViewRow): Event => ({
  id: row.id,
  title: row.title,
  category: row.category,
  location: row.location,
  state: row.state || undefined,
  city: row.city || undefined,
  date: row.date,
  time: row.time,
  price: row.price?.toString() || 'Gratuito',
  description: row.description || '',
  imageUrl: row.image_url || 'https://images.pexels.com/photos/1916817/pexels-photo-1916817.jpeg',
  participantsCount: row.participants_count || 0,
  createdBy: row.created_by,
  creatorAvatar: row.creator_avatar || undefined,
  creatorName: row.creator_name || undefined,
  isRecurring: row.is_recurring || false,
  averageRating: row.average_rating,
  reviewCount: row.review_count,
  maxParticipants: row.max_participants || undefined,
  isPrivate: row.is_private || false,
});

// ─── useEventById ─────────────────────────────────────────

interface EventDetail extends Event {
  participants: Participant[];
}

export const useEventById = (eventId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.events.detail(eventId || ''),
    queryFn: async (): Promise<EventDetail> => {
      // Fetch event + participants in parallel
      const [eventRes, participantsRes] = await Promise.all([
        supabase
          .from('events_with_details')
          .select(EVENT_LIST_COLUMNS)
          .eq('id', eventId!)
          .single(),
        supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_id', eventId!),
      ]);

      if (eventRes.error) throw eventRes.error;

      // Fetch profiles for participants
      const userIds = participantsRes.data?.map((p) => p.user_id) || [];
      let participants: Participant[] = [];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        participants = (profiles || []).map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        }));
      }

      return {
        ...transformEvent(eventRes.data as unknown as EventViewRow),
        participants,
      };
    },
    enabled: !!eventId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// ─── useInfiniteEventsFeed ────────────────────────────────

const PAGE_SIZE = 15;

export const useInfiniteEventsFeed = (filters?: {
  category?: string;
  city?: string;
  text?: string;
}) => {
  return useInfiniteQuery({
    queryKey: ['infinite-events-feed', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('events_with_details')
        .select(EVENT_LIST_COLUMNS)
        .eq('is_private', false)
        .or(`date.gte.${today},is_recurring.eq.true`)
        .order('date', { ascending: true })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.city) query = query.ilike('city', `%${filters.city}%`);
      if (filters?.text) {
        query = query.or(
          `title.ilike.%${filters.text}%,description.ilike.%${filters.text}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const events = (data as unknown as EventViewRow[]).map(transformEvent);
      return {
        events,
        nextPage: events.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 60 * 1000,
  });
};

// ─── useCreateEvent ───────────────────────────────────────

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      eventData: Omit<TablesInsert<'events'>, 'created_by'> & { userId: string }
    ) => {
      const { userId, ...rest } = eventData;
      const { data, error } = await supabase
        .from('events')
        .insert({ ...rest, created_by: userId })
        .select()
        .single();

      if (error) throw error;

      // Auto-join creator
      await supabase
        .from('event_participants')
        .insert({ event_id: data.id, user_id: userId });

      return data;
    },
    onSuccess: (data) => {
      haptic('success');
      toast.success('Evento criado com sucesso! 🎉');
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      if (data.created_by) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.events.userCreated(data.created_by),
        });
      }
    },
    onError: () => {
      haptic('error');
    },
  });
};

// ─── useJoinEvent (optimistic) ────────────────────────────

export const useJoinEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      // Check capacity first
      const { count } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      const { data: event } = await supabase
        .from('events')
        .select('max_participants')
        .eq('id', eventId)
        .single();

      if (event?.max_participants && count !== null && count >= event.max_participants) {
        throw new Error('Evento lotado! Não há mais vagas.');
      }

      const { error } = await supabase
        .from('event_participants')
        .insert({ event_id: eventId, user_id: userId });

      if (error) throw error;
      return { eventId, userId };
    },
    onMutate: async ({ eventId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.events.detail(eventId) });

      // Snapshot previous data
      const previous = queryClient.getQueryData(queryKeys.events.detail(eventId));

      // Optimistically increment participant count
      queryClient.setQueryData(queryKeys.events.detail(eventId), (old: any) => {
        if (!old) return old;
        return { ...old, participantsCount: (old.participantsCount || 0) + 1 };
      });

      return { previous, eventId };
    },
    onError: (_err, _vars, context) => {
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.events.detail(context.eventId),
          context.previous
        );
      }
      haptic('error');
    },
    onSuccess: ({ eventId, userId }) => {
      haptic('success');
      toast.success('Presença confirmada! 🎉');
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.userRegistered(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
};

// ─── useLeaveEvent (optimistic) ───────────────────────────

export const useLeaveEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;
      return { eventId, userId };
    },
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.events.detail(eventId) });
      const previous = queryClient.getQueryData(queryKeys.events.detail(eventId));

      queryClient.setQueryData(queryKeys.events.detail(eventId), (old: any) => {
        if (!old) return old;
        return { ...old, participantsCount: Math.max(0, (old.participantsCount || 0) - 1) };
      });

      return { previous, eventId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.events.detail(context.eventId),
          context.previous
        );
      }
      haptic('error');
    },
    onSuccess: ({ eventId, userId }) => {
      haptic('medium');
      toast.success('Você saiu do evento');
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.userRegistered(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
};
