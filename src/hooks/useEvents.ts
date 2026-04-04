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

const isEventUpcoming = (event: { date: string; time: string; is_recurring: boolean | null; recurrence_end_date: string | null }) => {
  const now = new Date();
  if (event.is_recurring) {
    if (!event.recurrence_end_date) return true;
    const endDate = new Date(`${event.recurrence_end_date}T23:59:59`);
    return endDate >= now;
  }
  // Consider event active for 3 hours after start time
  const eventDateTime = new Date(`${event.date}T${event.time}`);
  eventDateTime.setHours(eventDateTime.getHours() + 3);
  return now < eventDateTime;
};

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

export const usePublicEvents = () => {
  return useQuery({
    queryKey: queryKeys.events.publicWithDetails(),
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events_with_details')
        .select(EVENT_LIST_COLUMNS)
        .eq('is_private', false)
        .or(`date.gte.${today},is_recurring.eq.true`)
        .order('date', { ascending: true })
        .limit(500);

      if (error) throw error;

      return (data as EventWithDetails[])
        .filter(isEventUpcoming)
        .map(transformEvent);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useTrendingEvents = (limit = 5) => {
  return useQuery({
    queryKey: queryKeys.events.trending(),
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events_with_details')
        .select(EVENT_LIST_COLUMNS)
        .eq('is_private', false)
        .or(`date.gte.${today},is_recurring.eq.true`)
        .order('participants_count', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;

      return (data as EventWithDetails[])
        .filter(isEventUpcoming)
        .slice(0, limit)
        .map(transformEvent);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useFriendsEvents = (userId: string | undefined, limit = 3) => {
  return useQuery({
    queryKey: queryKeys.events.friends(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      // Single RPC call replaces 3 sequential queries
      const { data, error } = await supabase.rpc('get_friends_events', {
        p_user_id: userId,
        p_limit: limit,
      });

      if (error) throw error;

      return (data as EventWithDetails[])
        .filter(isEventUpcoming)
        .map(transformEvent);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useRecommendedEvents = (userId: string | undefined, interests: string[] | null, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.events.recommended(userId || ''),
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events_with_details')
        .select(EVENT_LIST_COLUMNS)
        .eq('is_private', false)
        .or(`date.gte.${today},is_recurring.eq.true`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const activeEvents = (data as EventWithDetails[]).filter(isEventUpcoming);

      const recommended = activeEvents.filter(event => {
        if (!interests || interests.length === 0) return true;
        return interests.some(interest => 
          event.category.toLowerCase().includes(interest.toLowerCase()) ||
          event.title.toLowerCase().includes(interest.toLowerCase())
        );
      });

      return recommended.slice(0, limit).map(transformEvent);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useNearbyEvents = (city: string | null, limit = 10) => {
  return useQuery({
    queryKey: ['nearby-events', city],
    queryFn: async () => {
      if (!city) return [];

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events_with_details')
        .select(EVENT_LIST_COLUMNS)
        .eq('is_private', false)
        .ilike('city', `%${city}%`)
        .or(`date.gte.${today},is_recurring.eq.true`)
        .order('date', { ascending: true })
        .limit(50);

      if (error) throw error;

      return (data as EventWithDetails[])
        .filter(isEventUpcoming)
        .slice(0, limit)
        .map(transformEvent);
    },
    enabled: !!city,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
