import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventStats {
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    category: string;
    image_url: string | null;
    max_participants: number | null;
  };
  participantsCount: number;
  averageRating: number;
  totalReviews: number;
  participants: {
    id: string;
    user_id: string;
    joined_at: string;
    profile: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  }[];
  reviews: {
    id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    profile: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  }[];
  participantsByDay: { date: string; count: number }[];
}

export const useEventStats = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ['event-stats', eventId],
    queryFn: async (): Promise<EventStats> => {
      if (!eventId) throw new Error('Event ID required');

      // Fetch event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, date, time, location, category, image_url, max_participants')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Fetch participants with profiles
      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('id, user_id, joined_at')
        .eq('event_id', eventId)
        .order('joined_at', { ascending: false });

      if (participantsError) throw participantsError;

      // Fetch profiles for participants
      const participantUserIds = participants?.map(p => p.user_id) || [];
      let participantProfiles: Map<string, { full_name: string; avatar_url: string | null }> = new Map();
      
      if (participantUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', participantUserIds);
        
        profiles?.forEach(p => {
          participantProfiles.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url });
        });
      }

      // Fetch reviews with profiles
      const { data: reviews, error: reviewsError } = await supabase
        .from('event_reviews')
        .select('id, user_id, rating, comment, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Fetch profiles for reviewers
      const reviewerUserIds = reviews?.map(r => r.user_id) || [];
      let reviewerProfiles: Map<string, { full_name: string; avatar_url: string | null }> = new Map();
      
      if (reviewerUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', reviewerUserIds);
        
        profiles?.forEach(p => {
          reviewerProfiles.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url });
        });
      }

      // Calculate participants by day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const dayMap = new Map<string, number>();
      
      // Initialize last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dayMap.set(dayKey, 0);
      }

      participants?.forEach(p => {
        const joinDate = new Date(p.joined_at);
        if (joinDate >= thirtyDaysAgo) {
          const dayKey = joinDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const count = dayMap.get(dayKey) || 0;
          dayMap.set(dayKey, count + 1);
        }
      });

      const participantsByDay = Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }));

      // Calculate stats
      const participantsCount = participants?.length || 0;
      const totalReviews = reviews?.length || 0;
      const averageRating = totalReviews > 0
        ? (reviews?.reduce((sum, r) => sum + r.rating, 0) || 0) / totalReviews
        : 0;

      return {
        event,
        participantsCount,
        averageRating,
        totalReviews,
        participants: participants?.map(p => ({
          ...p,
          profile: participantProfiles.get(p.user_id) || null
        })) || [],
        reviews: reviews?.map(r => ({
          ...r,
          profile: reviewerProfiles.get(r.user_id) || null
        })) || [],
        participantsByDay
      };
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
