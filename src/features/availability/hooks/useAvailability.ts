import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const AVAILABILITY_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface AvailableUser {
  id: string;
  user_id: string;
  interests: string[];
  city: string | null;
  location_lat: number | null;
  location_lng: number | null;
  expires_at: string;
  created_at: string;
  full_name: string;
  avatar_url: string | null;
  common_interests: string[];
}

export function useAvailability() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { city, latitude, longitude } = useGeolocation();

  // Check if user is currently available
  const { data: myAvailability, isLoading: loadingMyAvailability } = useQuery({
    queryKey: ['my-availability', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // refresh every 30s to update timer
  });

  const isAvailable = !!myAvailability;
  const expiresAt = myAvailability?.expires_at ? new Date(myAvailability.expires_at) : null;

  // Time remaining
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  useEffect(() => {
    if (!expiresAt) { setTimeRemaining(0); return; }
    const update = () => {
      const remaining = Math.max(0, expiresAt.getTime() - Date.now());
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        queryClient.invalidateQueries({ queryKey: ['my-availability'] });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, queryClient]);

  // Activate availability
  const activateMutation = useMutation({
    mutationFn: async (interests: string[]) => {
      if (!user?.id) throw new Error('Não autenticado');

      // Deactivate any existing
      await supabase
        .from('availability')
        .update({ is_active: false } as any)
        .eq('user_id', user.id)
        .eq('is_active', true);

      const expiresAt = new Date(Date.now() + AVAILABILITY_DURATION_MS).toISOString();
      const { data, error } = await supabase
        .from('availability')
        .insert({
          user_id: user.id,
          interests,
          city: city || profile?.city || null,
          location_lat: latitude,
          location_lng: longitude,
          expires_at: expiresAt,
          is_active: true,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability'] });
      queryClient.invalidateQueries({ queryKey: ['available-users'] });
      toast.success('Você está disponível agora! 🟢');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao ativar disponibilidade');
    },
  });

  // Deactivate
  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('availability')
        .update({ is_active: false } as any)
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability'] });
      queryClient.invalidateQueries({ queryKey: ['available-users'] });
      toast.success('Disponibilidade desativada');
    },
  });

  // Fetch available users
  const userCity = city || profile?.city || null;
  const userInterests = profile?.interests || [];

  const { data: availableUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['available-users', userCity, userInterests],
    queryFn: async () => {
      if (!user?.id || !userInterests.length) return [];
      const { data, error } = await supabase.rpc('get_available_users', {
        p_user_id: user.id,
        p_city: userCity,
        p_interests: userInterests,
      });
      if (error) throw error;
      return (data || []) as AvailableUser[];
    },
    enabled: !!user?.id && userInterests.length > 0,
    refetchInterval: 60000,
  });

  // Realtime subscription for new availability
  useEffect(() => {
    if (!user?.id) return;

    const timer = setTimeout(() => {
      const channel = supabase
        .channel('availability-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'availability' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['available-users'] });
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }, 2000);

    return () => clearTimeout(timer);
  }, [user?.id, queryClient]);

  return {
    isAvailable,
    myAvailability,
    loadingMyAvailability,
    timeRemaining,
    expiresAt,
    activate: activateMutation.mutate,
    activating: activateMutation.isPending,
    deactivate: deactivateMutation.mutate,
    deactivating: deactivateMutation.isPending,
    availableUsers,
    loadingUsers,
    availableCount: availableUsers.length,
  };
}
