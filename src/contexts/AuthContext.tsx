import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  interests: string[] | null;
  created_at: string;
  updated_at: string;
  user_number?: number;
  account_type?: string;
  verified?: boolean;
  verification_level?: number;
  business_verified?: boolean;
  onboarding_completed?: boolean;
}

export interface UserRestriction {
  restriction_type: string;
  reason: string | null;
  expires_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  restrictions: UserRestriction[];
  isBanned: boolean;
  isSuspended: boolean;
  isFeatureBlocked: (feature: string) => boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [restrictions, setRestrictions] = useState<UserRestriction[]>([]);
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);

  const fetchRestrictions = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.rpc('get_user_restrictions', { p_user_id: userId });
      const parsed = (data as unknown as UserRestriction[]) || [];
      setRestrictions(parsed);
    } catch {
      setRestrictions([]);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          const basicProfile = {
            user_id: userId,
            full_name: authUser.user.email?.split('@')[0] || 'Usuário',
            city: null,
            interests: null,
            avatar_url: null
          };
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert(basicProfile)
            .select()
            .single();

          if (!insertError && newProfile) {
            setProfile(newProfile);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get session first, then listen for changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Auth state resolved — unblock rendering immediately
      setLoading(false);

      if (session?.user) {
        // Profile/restrictions load in background, don't block UI
        fetchProfile(session.user.id);
        fetchRestrictions(session.user.id);
      }
      initializedRef.current = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer to avoid Supabase deadlock in auth callback
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRestrictions(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRestrictions([]);
        }
        
        if (!initializedRef.current) {
          setLoading(false);
          initializedRef.current = true;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRestrictions]);

  const isBanned = restrictions.some(r => r.restriction_type === 'restricted' && r.expires_at === null);
  const isSuspended = restrictions.some(r => r.restriction_type === 'restricted');
  const isFeatureBlocked = useCallback((feature: string) => {
    return restrictions.some(r => r.restriction_type === `feature_block_${feature}`);
  }, [restrictions]);

  const signOut = async () => {
    // Log logout before clearing session
    if (user) {
      try {
        await supabase.from('activity_logs' as any).insert({
          user_id: user.id,
          action: 'logout',
        } as any);
      } catch {}
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    queryClient.clear();
  };

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user, queryClient]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRestrictions(user.id);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  }, [user, fetchProfile, fetchRestrictions, queryClient]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      profileLoading,
      restrictions,
      isBanned,
      isSuspended,
      isFeatureBlocked,
      signOut,
      updateProfile,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
