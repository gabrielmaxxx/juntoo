/**
 * Hooks de perfil para a feature "profile".
 *
 * - useMyProfile()       → perfil do usuário logado (cache + optimistic)
 * - useUpdateProfile()   → mutation com optimistic update
 * - useUserProfile(id)   → perfil público de outro usuário
 *
 * Todos integrados com queryKeys centralizados para invalidação pelo Realtime.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────

type ProfileRow = Tables<'profiles'>;

export interface ProfileWithStats extends ProfileRow {
  eventsCreated: number;
  eventsJoined: number;
  friendsCount: number;
}

// ─── useMyProfile ─────────────────────────────────────────

export const useMyProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.profiles.byUserId(user?.id || ''),
    queryFn: async (): Promise<ProfileWithStats> => {
      const userId = user!.id;

      // Fetch profile + stats in parallel
      const [profileRes, eventsCreatedRes, eventsJoinedRes, friendsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('created_by', userId),
        supabase.from('event_participants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'accepted')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`),
      ]);

      if (profileRes.error) throw profileRes.error;

      return {
        ...profileRes.data,
        eventsCreated: eventsCreatedRes.count || 0,
        eventsJoined: eventsJoinedRes.count || 0,
        friendsCount: friendsRes.count || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ─── useUpdateProfile (optimistic) ────────────────────────

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: TablesUpdate<'profiles'>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (updates) => {
      const key = queryKeys.profiles.byUserId(user!.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      // Optimistic: merge updates into cached profile
      queryClient.setQueryData(key, (old: any) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
      toast.error('Erro ao atualizar perfil');
    },
    onSuccess: () => {
      toast.success('Perfil atualizado! ✅');
      // Invalida para garantir dados frescos do server
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.byUserId(user!.id) });
      // Também invalida profile do AuthContext
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

// ─── useUserProfile (perfil público) ──────────────────────

export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.profiles.byUserId(userId || ''),
    queryFn: async () => {
      const [profileRes, eventsRes, friendsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId!).single(),
        supabase
          .from('event_participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId!),
        supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'accepted')
          .or(`user_id.eq.${userId!},friend_id.eq.${userId!}`),
      ]);

      if (profileRes.error) throw profileRes.error;

      return {
        ...profileRes.data,
        eventsJoined: eventsRes.count || 0,
        friendsCount: friendsRes.count || 0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
