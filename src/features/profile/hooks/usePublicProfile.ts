/**
 * Hook para buscar dados de perfil público (sem autenticação).
 *
 * Resolve via username ou user_id (UUID). Usa as RPCs:
 * - get_public_profile_by_username
 * - get_public_profile_by_id
 *
 * Retorna `private: true` quando o usuário tem perfil restrito.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicProfileEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  city: string | null;
  image_url: string | null;
}

export interface PublicProfileData {
  user_id: string;
  username: string | null;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  interests: string[] | null;
  verified: boolean;
  business_verified: boolean;
  created_at: string;
  reputation: {
    score: number;
    events_attended: number;
    events_created: number;
    reviews_given: number;
    positive_reviews: number;
    achievements: number;
  };
  achievements: { badge_id: string; unlocked_at: string }[];
  public_events: PublicProfileEvent[];
  recent_participated_events?: PublicProfileEvent[];
  auth_provider?: string;
  email_confirmed?: boolean;
  private?: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const usePublicProfile = (handle: string | undefined) => {
  return useQuery({
    queryKey: ['public-profile', handle],
    queryFn: async (): Promise<PublicProfileData | null> => {
      if (!handle) return null;
      const isUuid = UUID_REGEX.test(handle);

      const { data, error } = isUuid
        ? await supabase.rpc('get_public_profile_by_id', { p_user_id: handle })
        : await supabase.rpc('get_public_profile_by_username', { p_username: handle });

      if (error) throw error;
      return data as unknown as PublicProfileData | null;
    },
    enabled: !!handle,
    staleTime: 5 * 60 * 1000,
  });
};
