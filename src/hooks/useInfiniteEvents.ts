import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { EVENT_LIST_COLUMNS, promoteSponsored } from '@/lib/eventColumns';

const PAGE_SIZE = 10;

export type EventSortBy = 'date_asc' | 'recent' | 'most_vacancies';

interface FetchEventsParams {
  pageParam?: number;
  filters: {
    text: string;
    category: string;
    state: string;
    city: string;
    date: Date | undefined;
    priceRange: 'all' | 'free' | 'paid';
    sortBy?: EventSortBy;
    hasAvailability?: boolean;
    today?: boolean;
  };
}

const fetchEvents = async ({ pageParam = 0, filters }: FetchEventsParams) => {
  const todayStr = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('events_with_details')
    .select(EVENT_LIST_COLUMNS)
    .eq('is_private', false)
    .gte('date', todayStr);

  // Sorting
  const sortBy = filters.sortBy || 'date_asc';
  if (sortBy === 'recent') {
    query = query.order('created_at', { ascending: false });
  } else if (sortBy === 'most_vacancies') {
    // Approximate: events with explicit max + fewer participants come first
    query = query.order('participants_count', { ascending: true });
  } else {
    query = query.order('date', { ascending: true }).order('time', { ascending: true });
  }

  query = query.range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

  // Server-side text search using ilike
  if (filters.text) {
    const searchText = `%${filters.text}%`;
    query = query.or(`title.ilike.${searchText},description.ilike.${searchText},location.ilike.${searchText},category.ilike.${searchText}`);
  }

  if (filters.category && filters.category !== 'Todos') {
    query = query.eq('category', filters.category);
  }

  if (filters.state) query = query.eq('state', filters.state);
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);

  if (filters.today) {
    query = query.eq('date', todayStr);
  } else if (filters.date) {
    const dateStr = filters.date.toISOString().split('T')[0];
    query = query.eq('date', dateStr);
  }

  if (filters.priceRange === 'free') {
    query = query.or('price.eq.0,price.is.null');
  } else if (filters.priceRange === 'paid') {
    query = query.gt('price', 0);
  }

  const { data, error } = await query;
  if (error) throw error;

  let events: Event[] = (data || []).map((event: any) => ({
    id: event.id!,
    title: event.title || '',
    category: event.category || '',
    location: event.location || '',
    state: event.state || '',
    city: event.city || '',
    date: event.date || '',
    time: event.time || '',
    price: event.price?.toString() || 'Gratuito',
    description: event.description || '',
    imageUrl: event.image_url || '/placeholder.svg',
    participantsCount: event.participants_count || 0,
    createdBy: event.created_by || '',
    creatorName: event.creator_name || '',
    creatorAvatar: event.creator_avatar || '',
    isRecurring: event.is_recurring || false,
    averageRating: event.average_rating || undefined,
    reviewCount: event.review_count || 0,
    maxParticipants: event.max_participants || undefined,
    isSponsored: event.is_sponsored ?? false,
    sponsorTier: event.sponsor_tier ?? null,
  }));

  // Client-side "with vacancies" filter (max_participants null = unlimited)
  if (filters.hasAvailability) {
    events = events.filter(
      (e) => !e.maxParticipants || (e.participantsCount ?? 0) < e.maxParticipants
    );
  }

  // Sponsored events get visual prominence at the top of the page,
  // without changing the relevance-based selection above.
  events = promoteSponsored(events);

  return {
    events,
    nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
  };
};

export const useInfiniteEvents = (filters: FetchEventsParams['filters']) => {
  return useInfiniteQuery({
    queryKey: ['infinite-events', filters],
    queryFn: ({ pageParam }) => fetchEvents({ pageParam, filters }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
  });
};
