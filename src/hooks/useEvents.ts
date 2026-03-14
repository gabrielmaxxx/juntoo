import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { queryKeys } from '@/lib/queryKeys';

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

const isEventUpcoming = (event: { date: string; time: string; is_recurring: boolean | null }) => {
  if (event.is_recurring) return true;
  const now = new Date();
  const eventDateTime = new Date(`${event.date}T${event.time}`);
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
  attendees: Array(event.participants_count).fill('participant'),
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
      const { data, error } = await supabase
        .from('events_with_details')
        .select('*')
        .eq('is_private', false)
        .order('date', { ascending: true })
        .limit(500);

      if (error) throw error;

      // Filter active events and transform
      const activeEvents = (data as EventWithDetails[])
        .filter(isEventUpcoming)
        .map(transformEvent);

      return activeEvents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTrendingEvents = (limit = 5) => {
  return useQuery({
    queryKey: queryKeys.events.trending(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events_with_details')
        .select('*')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const activeEvents = (data as EventWithDetails[])
        .filter(isEventUpcoming)
        .slice(0, limit)
        .map(transformEvent);

      return activeEvents;
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

      // Get user's friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      const friendIds = friendships?.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      ) || [];

      if (friendIds.length === 0) return [];

      // Get events where friends are participants
      const { data: friendParticipations } = await supabase
        .from('event_participants')
        .select('event_id')
        .in('user_id', friendIds);

      const friendEventIds = friendParticipations?.map(p => p.event_id) || [];
      
      if (friendEventIds.length === 0) return [];

      // Get event details
      const { data, error } = await supabase
        .from('events_with_details')
        .select('*')
        .in('id', friendEventIds)
        .eq('is_private', false);

      if (error) throw error;

      return (data as EventWithDetails[])
        .filter(isEventUpcoming)
        .slice(0, limit)
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
      const { data, error } = await supabase
        .from('events_with_details')
        .select('*')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const activeEvents = (data as EventWithDetails[]).filter(isEventUpcoming);

      // Filter by user interests
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
