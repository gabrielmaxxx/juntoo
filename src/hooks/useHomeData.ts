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
    return new Date(event.recurrence_end_date) >= now;
  }
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
  participantsCount: event.participants_count || 0,
  createdBy: event.created_by,
  creatorAvatar: event.creator_avatar || undefined,
  creatorName: event.creator_name || undefined,
  isRecurring: event.is_recurring || false,
  averageRating: event.average_rating,
  reviewCount: event.review_count,
});

interface HomeData {
  trending: Event[];
  nearby: Event[];
}

/**
 * Single query that fetches both trending and nearby events in one DB call,
 * then splits the results client-side. Reduces 2 separate queries to 1.
 */
export const useHomeData = (city: string | null) => {
  return useQuery<HomeData>({
    queryKey: ['home-data', city],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Single query fetching enough events for both trending + nearby
      const { data, error } = await supabase
        .from('events_with_details')
        .select(EVENT_LIST_COLUMNS)
        .eq('is_private', false)
        .or(`date.gte.${today},is_recurring.eq.true`)
        .order('participants_count', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;

      const upcomingEvents = (data as EventWithDetails[]).filter(isEventUpcoming);

      // Trending: top 5 by participants (already sorted)
      const trending = upcomingEvents.slice(0, 5).map(transformEvent);

      // Nearby: filter by city, take top 10
      const nearby = city
        ? upcomingEvents
            .filter(e => e.city?.toLowerCase().includes(city.toLowerCase()))
            .slice(0, 10)
            .map(transformEvent)
        : [];

      return { trending, nearby };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
