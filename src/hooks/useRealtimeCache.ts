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
    // Update user context when auth state changes
    cacheManager.setUserId(user?.id || null);

    // Subscribe to realtime updates when user is authenticated
    if (user?.id) {
      cacheManager.subscribe();
    }

    return () => {
      // Cleanup on unmount or user logout
      if (!user?.id) {
        cacheManager.unsubscribe();
      }
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
