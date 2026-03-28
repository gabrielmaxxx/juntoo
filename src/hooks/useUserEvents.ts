import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import { EVENT_LIST_COLUMNS } from '@/lib/eventColumns';

interface EventWithDetails {
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
}

const transformEvent = (event: EventWithDetails): Event => ({
  id: event.id,
  title: event.title,
  category: event.category,
  location: event.location,
  state: event.state || undefined,
  city: event.city || undefined,
  date: event.date,
  time: event.time,
  price: event.price?.toString() || 'Gratuito',
  description: event.description || '',
  imageUrl: event.image_url || 'https://images.pexels.com/photos/1916817/pexels-photo-1916817.jpeg',
  participantsCount: event.participants_count || 0,
  createdBy: event.created_by,
  creatorAvatar: event.creator_avatar || undefined,
  creatorName: event.creator_name || undefined,
  isRecurring: event.is_recurring || false,
  averageRating: event.average_rating,
  reviewCount: event.review_count,
});

export const useUserRegisteredEvents = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.events.userRegistered(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      // Get event IDs user is registered for
      const { data: participations, error: participationsError } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', userId);

      if (participationsError) throw participationsError;

      const eventIds = participations?.map(p => p.event_id) || [];
      
      if (eventIds.length === 0) return [];

      // Get events with details
      const { data, error } = await supabase
        .from('events_with_details')
        .select('*')
        .in('id', eventIds);

      if (error) throw error;

      return (data as EventWithDetails[]).map(transformEvent);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes for user-specific data
    gcTime: 5 * 60 * 1000,
  });
};

export const useUserCreatedEvents = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.events.userCreated(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('events_with_details')
        .select('*')
        .eq('created_by', userId);

      if (error) throw error;

      return (data as EventWithDetails[]).map(transformEvent);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
