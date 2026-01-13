import { useRealtimeCache } from '@/hooks/useRealtimeCache';

interface RealtimeCacheProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes the realtime cache system.
 * Should be placed inside AuthProvider and QueryClientProvider.
 */
export const RealtimeCacheProvider = ({ children }: RealtimeCacheProviderProps) => {
  // Initialize the realtime cache system
  useRealtimeCache();

  return <>{children}</>;
};
