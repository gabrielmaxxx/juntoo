import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Community {
  id: string;
  name: string;
  description: string | null;
  category: string;
  city: string | null;
  avatar_url: string | null;
  creator_id: string;
  member_count: number;
  is_public: boolean;
  rules: string | null;
  created_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'admin' | 'member';
  status: string;
  joined_at: string;
  profiles?: { full_name: string; avatar_url: string | null };
}

export interface RecurringCommunityEvent {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  recurrence: 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number;
  time: string;
  location: string;
  category: string;
  max_participants: number | null;
  is_active: boolean;
}

export function useCommunities(city?: string | null, category?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['communities', city, category],
    queryFn: async () => {
      let query = supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false })
        .limit(50);

      if (city) query = query.eq('city', city);
      if (category) query = query.eq('category', category);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Community[];
    },
    enabled: !!user?.id,
  });
}

export function useMyCommunities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-communities', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('community_members')
        .select('community_id, role, communities(*)')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m.communities,
        myRole: m.role,
      })) as (Community & { myRole: 'admin' | 'member' })[];
    },
    enabled: !!user?.id,
  });
}

export function useCommunityDetails(communityId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const communityQuery = useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      if (!communityId) return null;
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();
      if (error) throw error;
      return data as Community;
    },
    enabled: !!communityId,
  });

  const membersQuery = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: async () => {
      if (!communityId) return [];
      const { data, error } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .eq('status', 'approved')
        .order('joined_at', { ascending: true });
      if (error) throw error;
      
      // Fetch profiles for members
      const userIds = (data || []).map((m: any) => m.user_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        profiles = profileData || [];
      }
      
      return (data || []).map((m: any) => ({
        ...m,
        profiles: profiles.find((p: any) => p.user_id === m.user_id) || { full_name: 'Usuário', avatar_url: null },
      })) as CommunityMember[];
    },
    enabled: !!communityId,
  });

  const myMembershipQuery = useQuery({
    queryKey: ['community-membership', communityId, user?.id],
    queryFn: async () => {
      if (!communityId || !user?.id) return null;
      const { data, error } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as CommunityMember | null;
    },
    enabled: !!communityId && !!user?.id,
  });

  const recurringEventsQuery = useQuery({
    queryKey: ['community-recurring-events', communityId],
    queryFn: async () => {
      if (!communityId) return [];
      const { data, error } = await supabase
        .from('recurring_community_events')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as RecurringCommunityEvent[];
    },
    enabled: !!communityId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['community', communityId] });
    queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
    queryClient.invalidateQueries({ queryKey: ['community-membership', communityId] });
    queryClient.invalidateQueries({ queryKey: ['my-communities'] });
  };

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!communityId || !user?.id) throw new Error('Não autenticado');
      const isPublic = communityQuery.data?.is_public;
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member',
          status: isPublic ? 'approved' : 'pending',
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      const isPublic = communityQuery.data?.is_public;
      toast.success(isPublic ? 'Você entrou na comunidade!' : 'Solicitação enviada!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao entrar'),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!communityId || !user?.id) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Você saiu da comunidade');
    },
  });

  // Realtime for members changes
  useEffect(() => {
    if (!communityId) return;
    const timer = setTimeout(() => {
      const channel = supabase
        .channel(`community-${communityId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'community_members', filter: `community_id=eq.${communityId}` }, () => {
          invalidateAll();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }, 2000);
    return () => clearTimeout(timer);
  }, [communityId]);

  const isMember = myMembershipQuery.data?.status === 'approved';
  const isPending = myMembershipQuery.data?.status === 'pending';
  const isAdmin = myMembershipQuery.data?.role === 'admin' || communityQuery.data?.creator_id === user?.id;

  return {
    community: communityQuery.data,
    loading: communityQuery.isLoading,
    members: membersQuery.data || [],
    loadingMembers: membersQuery.isLoading,
    myMembership: myMembershipQuery.data,
    isMember,
    isPending,
    isAdmin,
    recurringEvents: recurringEventsQuery.data || [],
    join: joinMutation.mutate,
    joining: joinMutation.isPending,
    leave: leaveMutation.mutate,
    leaving: leaveMutation.isPending,
  };
}

export function useCommunityChat(communityId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['community-messages', communityId],
    queryFn: async () => {
      if (!communityId) return [];
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      
      const userIds = [...new Set((data || []).map((m: any) => m.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds);
        profiles = p || [];
      }
      return (data || []).map((m: any) => ({
        ...m,
        profiles: profiles.find((p: any) => p.user_id === m.user_id) || { full_name: 'Usuário', avatar_url: null },
      }));
    },
    enabled: !!communityId,
  });

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!communityId || !user?.id) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('community_messages')
        .insert({ community_id: communityId, user_id: user.id, message } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-messages', communityId] });
    },
  });

  // Realtime
  useEffect(() => {
    if (!communityId) return;
    const timer = setTimeout(() => {
      const channel = supabase
        .channel(`community-chat-${communityId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `community_id=eq.${communityId}` }, () => {
          queryClient.invalidateQueries({ queryKey: ['community-messages', communityId] });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }, 2000);
    return () => clearTimeout(timer);
  }, [communityId]);

  return {
    messages: messagesQuery.data || [],
    loading: messagesQuery.isLoading,
    send: sendMutation.mutate,
    sending: sendMutation.isPending,
  };
}

export function useCreateCommunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      category: string;
      city?: string;
      is_public: boolean;
      rules?: string;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { data: created, error } = await supabase
        .from('communities')
        .insert({ ...data, creator_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });
      toast.success('Comunidade criada com sucesso! 🎉');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar comunidade'),
  });
}
