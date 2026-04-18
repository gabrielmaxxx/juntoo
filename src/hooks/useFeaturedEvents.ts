import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { EVENT_LIST_COLUMNS } from '@/lib/eventColumns';

interface EventRow {
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
  image_url: string | null;
  created_by: string;
  creator_name: string | null;
  creator_avatar: string | null;
  participants_count: number;
  average_rating: number;
  review_count: number;
  is_recurring: boolean | null;
}

const transform = (e: EventRow): Event => ({
  id: e.id,
  title: e.title,
  category: e.category,
  location: e.location,
  state: e.state || undefined,
  city: e.city || undefined,
  date: e.date,
  time: e.time,
  price: e.price?.toString() || 'Gratuito',
  description: e.description || '',
  imageUrl: e.image_url || 'https://images.pexels.com/photos/1916817/pexels-photo-1916817.jpeg',
  participantsCount: e.participants_count || 0,
  createdBy: e.created_by,
  creatorAvatar: e.creator_avatar || undefined,
  creatorName: e.creator_name || undefined,
  isRecurring: e.is_recurring || false,
  averageRating: e.average_rating,
  reviewCount: e.review_count,
});

/**
 * Curated events selected by the Juntoo team. Pinned at the top of the home feed.
 */
export const useFeaturedEvents = (limit = 5) => {
  return useQuery<Event[]>({
    queryKey: ['featured-events', limit],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await (supabase as any)
        .from('events_with_details')
        .select(EVENT_LIST_COLUMNS + ', is_featured')
        .eq('is_private', false)
        .eq('is_featured', true)
        .or(`date.gte.${today},is_recurring.eq.true`)
        .order('date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return ((data as EventRow[]) || []).map(transform);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
