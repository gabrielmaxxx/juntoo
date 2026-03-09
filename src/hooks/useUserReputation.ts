import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReputationStats {
  average_overall: number;
  average_respect: number;
  average_punctuality: number;
  average_reliability: number;
  average_communication: number;
  average_safety: number;
  total_reviews: number;
  events_joined: number;
  events_attended: number;
  attendance_rate: number;
}

export interface UserReview {
  id: string;
  reviewer_user_id: string;
  reviewed_user_id: string;
  event_id: string;
  respect_rating: number;
  punctuality_rating: number;
  reliability_rating: number;
  communication_rating: number;
  safety_rating: number;
  overall_rating: number;
  comment: string | null;
  created_at: string;
  reviewer_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
  event_title?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

function calculateBadges(stats: ReputationStats): Badge[] {
  const badges: Badge[] = [];

  if (stats.events_attended >= 10) {
    badges.push({
      id: 'active_participant',
      name: 'Participante Ativo',
      description: 'Participou de 10+ eventos',
      icon: '🎯',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    });
  }

  if (stats.attendance_rate >= 90 && stats.events_joined >= 5) {
    badges.push({
      id: 'reliable_member',
      name: 'Membro Confiável',
      description: 'Taxa de presença acima de 90%',
      icon: '✅',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    });
  }

  if (stats.average_overall >= 4.7 && stats.total_reviews >= 20) {
    badges.push({
      id: 'top_rated',
      name: 'Melhor Avaliado',
      description: 'Nota média acima de 4.7 com 20+ avaliações',
      icon: '⭐',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    });
  }

  if (stats.average_safety >= 4.5 && stats.total_reviews >= 5) {
    badges.push({
      id: 'safe_person',
      name: 'Pessoa Segura',
      description: 'Alta pontuação em segurança',
      icon: '🛡️',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    });
  }

  if (stats.events_attended >= 5 && stats.average_overall >= 4.0) {
    badges.push({
      id: 'trusted_organizer',
      name: 'Organizador Confiável',
      description: 'Organizou 5+ eventos com boas avaliações',
      icon: '🏆',
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    });
  }

  return badges;
}

export const useUserReputation = (userId: string | undefined) => {
  const statsQuery = useQuery({
    queryKey: ['user-reputation', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_reputation', {
        target_user_id: userId!,
      });
      if (error) throw error;
      return data as unknown as ReputationStats;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const reviewsQuery = useQuery({
    queryKey: ['user-reviews', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_reviews')
        .select('*')
        .eq('reviewed_user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;

      // Fetch reviewer profiles and event titles
      const reviewerIds = [...new Set(data.map((r: any) => r.reviewer_user_id))];
      const eventIds = [...new Set(data.map((r: any) => r.event_id))];

      const [profilesRes, eventsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', reviewerIds),
        supabase.from('events').select('id, title').in('id', eventIds),
      ]);

      const profilesMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]) || []);
      const eventsMap = new Map(eventsRes.data?.map((e) => [e.id, e.title]) || []);

      return data.map((r: any) => ({
        ...r,
        reviewer_profile: profilesMap.get(r.reviewer_user_id) || { full_name: 'Usuário', avatar_url: null },
        event_title: eventsMap.get(r.event_id) || 'Evento',
      })) as UserReview[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const badges = statsQuery.data ? calculateBadges(statsQuery.data) : [];

  return {
    stats: statsQuery.data,
    reviews: reviewsQuery.data || [],
    badges,
    loading: statsQuery.isLoading,
    refetch: () => {
      statsQuery.refetch();
      reviewsQuery.refetch();
    },
  };
};
