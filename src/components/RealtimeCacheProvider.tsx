import { useRealtimeCache } from '@/hooks/useRealtimeCache';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

interface RealtimeCacheProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes the realtime cache and offline storage systems.
 * Should be placed inside AuthProvider and QueryClientProvider.
 */
export const RealtimeCacheProvider = ({ children }: RealtimeCacheProviderProps) => {
  useRealtimeCache();
  useOfflineStorage();

  return <>{children}</>;
};
