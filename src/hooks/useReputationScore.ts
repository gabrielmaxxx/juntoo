import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * FÓRMULA OFICIAL ÚNICA DE REPUTAÇÃO (0–1000)
 * Calculada exclusivamente por `calculate_reputation_score()` no banco.
 *
 * Positivos: +10 evento participado, +15 evento criado, +2 avaliação feita,
 *            +5 avaliação positiva recebida, +25 conquista.
 * Penalidades automáticas: -15 não comparecimento, -30 cancelamento com <24h,
 *            -50 denúncia comprovada pela moderação.
 * Override manual de moderador (excepcional) entra como ajuste, sempre com autor e motivo
 * registrados em `user_trust_score_overrides`.
 *
 * `user_trust_scores` (0–100) é derivada automaticamente deste score (score / 10).
 */
export interface ReputationScoreData {
  score: number;
  events_attended: number;
  events_created: number;
  reviews_given: number;
  positive_reviews: number;
  achievements: number;
  no_shows: number;
  late_cancellations: number;
  confirmed_reports: number;
  manual_adjustment: number;
  positive_points: number;
  penalty_points: number;
}


export interface Achievement {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
}

export const REPUTATION_LEVELS = [
  { name: 'Novato', min: 0, max: 99, color: 'text-muted-foreground', bg: 'bg-muted', accent: 'hsl(var(--muted-foreground))' },
  { name: 'Explorador', min: 100, max: 299, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', accent: '#3b82f6' },
  { name: 'Conector', min: 300, max: 599, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30', accent: 'hsl(var(--primary))' },
  { name: 'Embaixador', min: 600, max: 899, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', accent: '#9333ea' },
  { name: 'Lendário', min: 900, max: 1000, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', accent: '#d97706' },
] as const;

export const BADGE_DEFINITIONS = [
  { id: 'primeiro_passo', name: 'Primeiro Passo', description: 'Participou do primeiro evento', icon: '👣', hint: 'Participe de 1 evento' },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Participou de 10 eventos', icon: '🦋', hint: 'Participe de 10 eventos' },
  { id: 'organizador', name: 'Organizador', description: 'Criou 5 eventos', icon: '🎪', hint: 'Crie 5 eventos' },
  { id: 'confiavel', name: 'Confiável', description: '20 avaliações positivas recebidas', icon: '💎', hint: 'Receba 20 avaliações positivas' },
  { id: 'explorador', name: 'Explorador', description: 'Participou de 5 categorias diferentes', icon: '🧭', hint: 'Participe de 5 categorias' },
  { id: 'frequentador', name: 'Frequentador', description: '4 semanas seguidas participando', icon: '🔥', hint: 'Participe por 4 semanas seguidas' },
] as const;

export function getReputationLevel(score: number) {
  return REPUTATION_LEVELS.find(l => score >= l.min && score <= l.max) || REPUTATION_LEVELS[0];
}

export const useReputationScore = (userId: string | undefined) => {
  const scoreQuery = useQuery({
    queryKey: ['reputation-score', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_reputation_score', { p_user_id: userId! });
      if (error) throw error;
      return data as unknown as ReputationScoreData;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const achievementsQuery = useQuery({
    queryKey: ['user-achievements', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId!)
        .order('unlocked_at', { ascending: false });
      if (error) throw error;
      return data as Achievement[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: ['reputation-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_reputation_log')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    scoreData: scoreQuery.data,
    achievements: achievementsQuery.data || [],
    history: historyQuery.data || [],
    loading: scoreQuery.isLoading,
    refetch: () => {
      scoreQuery.refetch();
      achievementsQuery.refetch();
      historyQuery.refetch();
    },
  };
};
