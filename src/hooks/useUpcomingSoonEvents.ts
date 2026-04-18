import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { EVENT_LIST_COLUMNS } from '@/lib/eventColumns';

interface Row {
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
  max_participants: number | null;
}

const transform = (e: Row): Event => ({
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
  imageUrl: e.image_url || '/placeholder.svg',
  participantsCount: e.participants_count || 0,
  createdBy: e.created_by,
  creatorAvatar: e.creator_avatar || undefined,
  creatorName: e.creator_name || undefined,
  isRecurring: e.is_recurring || false,
  averageRating: e.average_rating,
  reviewCount: e.review_count,
  maxParticipants: e.max_participants || undefined,
});

/**
 * Events starting within the next 48 hours, ordered by datetime.
 * Used to surface "Acontecendo em breve" with countdowns for events <24h away.
 */
export const useUpcomingSoonEvents = (city?: string | null, limit = 8) => {
  return useQuery<Event[]>({
    queryKey: ['upcoming-soon', city, limit],
    queryFn: async () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const endStr = in48h.toISOString().split('T')[0];

      let q = (supabase as any)
        .from('events_with_details')
        .select(EVENT_LIST_COLUMNS)
        .eq('is_private', false)
        .gte('date', todayStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(limit);

      if (city) q = q.ilike('city', `%${city}%`);

      const { data, error } = await q;
      if (error) throw error;

      // Filter further on client to enforce strict 48h window using full datetime
      const cutoff = in48h.getTime();
      return ((data as Row[]) || [])
        .filter((r) => {
          const dt = new Date(`${r.date}T${r.time}`).getTime();
          return dt >= now.getTime() && dt <= cutoff;
        })
        .map(transform);
    },
    staleTime: 60_000,
  });
};
