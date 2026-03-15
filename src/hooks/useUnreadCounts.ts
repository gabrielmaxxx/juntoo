import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UnreadCounts {
  dm_unread: number;
  event_unread: number;
  notif_unread: number;
}

/**
 * Lightweight hook that fetches all unread counts in a single RPC call.
 * Used in AppHeader instead of loading full conversation data.
 * Invalidated by CacheManager when relevant tables change.
 */
export function useUnreadCounts() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async (): Promise<UnreadCounts> => {
      if (!user) return { dm_unread: 0, event_unread: 0, notif_unread: 0 };

      const { data, error } = await supabase.rpc('get_unread_counts', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error fetching unread counts:', error);
        return { dm_unread: 0, event_unread: 0, notif_unread: 0 };
      }

      return data as UnreadCounts;
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30s - refreshed by realtime invalidation
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    dmUnread: data?.dm_unread ?? 0,
    eventUnread: data?.event_unread ?? 0,
    notifUnread: data?.notif_unread ?? 0,
    totalMessageUnread: (data?.dm_unread ?? 0) + (data?.event_unread ?? 0),
  };
}
