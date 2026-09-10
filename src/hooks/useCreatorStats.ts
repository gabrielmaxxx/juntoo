import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { isBeforeToday } from '@/lib/dateUtils';


export interface CreatorStats {
  totalEvents: number;
  totalParticipants: number;
  averageRating: number;
  totalReviews: number;
  upcomingEvents: number;
  pastEvents: number;
  eventsByCategory: { category: string; count: number }[];
  participantsByMonth: { month: string; participants: number }[];
  recentActivity: {
    eventId: string;
    eventTitle: string;
    type: 'participant' | 'review';
    date: string;
    details: string;
  }[];
}

export const useCreatorStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['creator-stats', userId],
    queryFn: async (): Promise<CreatorStats> => {
      if (!userId) throw new Error('User ID required');

      // Fetch all events created by user
      const { data: events, error: eventsError } = await supabase
        .from('events_with_details')
        .select('*')
        .eq('created_by', userId);

      if (eventsError) throw eventsError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate basic stats
      const totalEvents = events?.length || 0;
      const totalParticipants = events?.reduce((sum, e) => sum + (e.participants_count || 0), 0) || 0;
      const totalReviews = events?.reduce((sum, e) => sum + (e.review_count || 0), 0) || 0;
      
      const eventsWithRating = events?.filter(e => e.average_rating && e.average_rating > 0) || [];
      const averageRating = eventsWithRating.length > 0
        ? eventsWithRating.reduce((sum, e) => sum + (e.average_rating || 0), 0) / eventsWithRating.length
        : 0;

      const upcomingEvents = events?.filter(e => !isBeforeToday(e.date)).length || 0;
      const pastEvents = events?.filter(e => isBeforeToday(e.date)).length || 0;


      // Events by category
      const categoryMap = new Map<string, number>();
      events?.forEach(e => {
        const count = categoryMap.get(e.category) || 0;
        categoryMap.set(e.category, count + 1);
      });
      const eventsByCategory = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Participants by month (last 6 months)
      const eventIds = events?.map(e => e.id) || [];
      let participantsByMonth: { month: string; participants: number }[] = [];

      if (eventIds.length > 0) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('joined_at')
          .in('event_id', eventIds)
          .gte('joined_at', sixMonthsAgo.toISOString());

        if (!participantsError && participants) {
          const monthMap = new Map<string, number>();
          
          // Initialize last 6 months
          for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            monthMap.set(monthKey, 0);
          }

          participants.forEach(p => {
            const date = new Date(p.joined_at);
            const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            const count = monthMap.get(monthKey) || 0;
            monthMap.set(monthKey, count + 1);
          });

          participantsByMonth = Array.from(monthMap.entries())
            .map(([month, participants]) => ({ month, participants }));
        }
      }

      // Recent activity
      let recentActivity: CreatorStats['recentActivity'] = [];

      if (eventIds.length > 0) {
        // Get recent participants
        const { data: recentParticipants } = await supabase
          .from('event_participants')
          .select('event_id, joined_at')
          .in('event_id', eventIds)
          .order('joined_at', { ascending: false })
          .limit(5);

        // Get recent reviews
        const { data: recentReviews } = await supabase
          .from('event_reviews')
          .select('event_id, created_at, rating')
          .in('event_id', eventIds)
          .order('created_at', { ascending: false })
          .limit(5);

        const eventMap = new Map(events?.map(e => [e.id, e.title]) || []);

        const participantActivities = (recentParticipants || []).map(p => ({
          eventId: p.event_id,
          eventTitle: eventMap.get(p.event_id) || 'Evento',
          type: 'participant' as const,
          date: p.joined_at,
          details: 'Novo participante confirmado'
        }));

        const reviewActivities = (recentReviews || []).map(r => ({
          eventId: r.event_id,
          eventTitle: eventMap.get(r.event_id) || 'Evento',
          type: 'review' as const,
          date: r.created_at,
          details: `Nova avaliação: ${r.rating} estrelas`
        }));

        recentActivity = [...participantActivities, ...reviewActivities]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);
      }

      return {
        totalEvents,
        totalParticipants,
        averageRating,
        totalReviews,
        upcomingEvents,
        pastEvents,
        eventsByCategory,
        participantsByMonth,
        recentActivity
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};
