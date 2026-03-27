import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useActivityLog = () => {
  const { user } = useAuth();

  const logActivity = useCallback(async (
    action: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!user) return;
    try {
      await supabase.from('activity_logs' as any).insert({
        user_id: user.id,
        action,
        metadata: metadata || {},
      } as any);
    } catch {
      // Silent fail — logging should never block UX
    }
  }, [user]);

  return { logActivity };
};
