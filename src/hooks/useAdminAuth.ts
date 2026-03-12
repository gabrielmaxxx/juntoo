import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AdminRole = 'moderator' | 'admin' | 'super_admin';

interface AdminAuth {
  isAdmin: boolean;
  role: AdminRole | null;
  loading: boolean;
  user: ReturnType<typeof useAuthContext>['user'];
  profile: ReturnType<typeof useAuthContext>['profile'];
  signOut: () => Promise<void>;
  logAction: (action: string, targetType: string, targetId?: string, reason?: string, metadata?: Record<string, unknown>) => Promise<void>;
}

export const useAdminAuth = (): AdminAuth => {
  const { user, profile, loading: authLoading, signOut } = useAuthContext();
  const [role, setRole] = useState<AdminRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setRoleLoading(false);
      return;
    }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['moderator', 'admin', 'super_admin'])
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Pick highest role
          const roles = data.map(d => d.role);
          if (roles.includes('super_admin')) setRole('super_admin');
          else if (roles.includes('admin')) setRole('admin');
          else if (roles.includes('moderator')) setRole('moderator');
          else setRole(null);
        } else {
          setRole(null);
        }
        setRoleLoading(false);
      });
  }, [user]);

  const logAction = useCallback(async (
    action: string,
    targetType: string,
    targetId?: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!user) return;
    await supabase.from('moderation_logs').insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId || null,
      reason: reason || null,
      metadata: metadata || {},
    });
  }, [user]);

  return {
    isAdmin: !!role,
    role,
    loading: authLoading || roleLoading,
    user,
    profile,
    signOut,
    logAction,
  };
};
