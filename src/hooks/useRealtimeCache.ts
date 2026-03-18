import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cacheManager } from '@/lib/cacheManager';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Hook to initialize and manage the realtime cache system.
 * Should be used once at the app root level.
 */
export const useRealtimeCache = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  useEffect(() => {
    // Initialize the cache manager with the query client
    cacheManager.initialize(queryClient);
  }, [queryClient]);

  useEffect(() => {
    cacheManager.setUserId(user?.id || null);

    if (user?.id) {
      cacheManager.subscribe();
    } else {
      cacheManager.unsubscribe();
    }

    return () => {
      cacheManager.unsubscribe();
    };
  }, [user?.id]);

  return {
    invalidateEvents: () => cacheManager.invalidateEvents(),
    invalidateEvent: (eventId: string) => cacheManager.invalidateEvent(eventId),
    invalidateUserEvents: (userId: string) => cacheManager.invalidateUserEvents(userId),
    invalidateProfile: (userId: string) => cacheManager.invalidateProfile(userId),
    invalidateFriendships: (userId: string) => cacheManager.invalidateFriendships(userId),
  };
};
