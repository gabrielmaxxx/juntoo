import { useQuery } from '@tanstack/react-query';
import { Event } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { parseISO, addHours, isBefore } from 'date-fns';

interface Friend {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
}

const isEventCompleted = (event: Event): boolean => {
  if (event.isRecurring) return false;
  const eventDateTime = parseISO(`${event.date}T${event.time}`);
  const eventEndTime = addHours(eventDateTime, 24);
  return isBefore(eventEndTime, new Date());
};

export const useProfileData = () => {
  const { user, profile, updateProfile, refreshProfile } = useAuthContext();
  const { toast } = useToast();

  // Fetch user number
  const { data: userNumber = '' } = useQuery({
    queryKey: ['profile-user-number', profile?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_number')
        .eq('user_id', profile!.user_id)
        .single();
      if (data && !error) {
        return data.user_number.toString().padStart(6, '0');
      }
      return '';
    },
    enabled: !!profile?.user_id,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch events + friends in parallel via single query
  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['profile-events', profile?.user_id],
    queryFn: async () => {
      const { data: participations, error: participationsError } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', profile!.user_id);

      if (participationsError) throw participationsError;
      if (!participations || participations.length === 0) return { upcoming: [] as Event[], completed: [] as Event[] };

      const eventIds = participations.map(p => p.event_id);

      const { data: eventsRaw, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);

      if (eventsError) throw eventsError;

      const creatorIds = [...new Set(eventsRaw?.map(e => e.created_by) || [])];
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', creatorIds);

      const creatorsMap = new Map(creatorsData?.map(c => [c.user_id, c]) || []);

      const transformed: Event[] = (eventsRaw || []).map(event => {
        const creator = creatorsMap.get(event.created_by);
        return {
          id: event.id,
          title: event.title,
          category: event.category,
          location: event.location,
          state: event.state || '',
          city: event.city || '',
          date: event.date,
          time: event.time,
          price: event.price?.toString() || '0',
          description: event.description || '',
          imageUrl: event.image_url || '',
          participantsCount: 0,
          createdBy: event.created_by,
          creatorName: creator?.full_name || 'Usuário',
          creatorAvatar: creator?.avatar_url || '',
          isRecurring: event.is_recurring || false,
        };
      });

      return {
        upcoming: transformed.filter(e => !isEventCompleted(e)),
        completed: transformed.filter(e => isEventCompleted(e)),
      };
    },
    enabled: !!profile?.user_id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: friends = [] } = useQuery({
    queryKey: ['profile-friends', profile?.user_id],
    queryFn: async (): Promise<Friend[]> => {
      const { data, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${profile!.user_id},friend_id.eq.${profile!.user_id}`);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const friendIds = data.map(f =>
        f.user_id === profile!.user_id ? f.friend_id : f.user_id
      );

      const { data: friendsData, error: friendsError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, city')
        .in('user_id', friendIds);

      if (friendsError) throw friendsError;
      return friendsData || [];
    },
    enabled: !!profile?.user_id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({ title: "Formato não suportado", description: "Use imagens nos formatos JPG, PNG, WebP ou GIF.", variant: "destructive" });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande", description: "Por favor, selecione uma imagem menor que 5MB.", variant: "destructive" });
      return false;
    }

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}-avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

      await updateProfile({ avatar_url: avatarUrl });
      toast({ title: "Avatar atualizado!", description: "Sua foto de perfil foi atualizada com sucesso." });
      await refreshProfile();
      return true;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Erro no upload", description: "Não foi possível carregar a imagem. Tente novamente.", variant: "destructive" });
      return false;
    }
  };

  const handleSaveProfile = async (editedName: string, selectedCity: string, selectedState: string, selectedInterests: string[]) => {
    try {
      const location = selectedCity && selectedState ? `${selectedCity}, ${selectedState}` : profile?.city || null;
      await updateProfile({
        full_name: editedName,
        city: location,
        interests: selectedInterests.length > 0 ? selectedInterests : null,
      });
      toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas com sucesso." });
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: "Erro ao salvar", description: "Não foi possível atualizar seu perfil. Tente novamente.", variant: "destructive" });
      return false;
    }
  };

  return {
    user,
    profile,
    userNumber,
    upcomingEvents: eventsData?.upcoming ?? [],
    completedEvents: eventsData?.completed ?? [],
    friends,
    loadingEvents,
    handleAvatarUpload,
    handleSaveProfile,
  };
};
