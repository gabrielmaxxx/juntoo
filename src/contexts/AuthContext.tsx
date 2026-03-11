import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  restrictions: UserRestriction[];
  isBanned: boolean;
  isSuspended: boolean;
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
  const [restrictions, setRestrictions] = useState<UserRestriction[]>([]);
  const queryClient = useQueryClient();

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
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRestrictions(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRestrictions([]);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRestrictions(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRestrictions]);

  const isBanned = restrictions.some(r => r.restriction_type === 'restricted' && r.expires_at === null);
  const isSuspended = restrictions.some(r => r.restriction_type === 'restricted');

  const signOut = async () => {
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
      restrictions,
      isBanned,
      isSuspended,
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
