import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/AppHeader';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, UserPlus, UserMinus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { parseISO, addHours, isBefore } from 'date-fns';
import type { Event } from '@/types';

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  interests: string[] | null;
}

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || userId === user?.id) {
      navigate('/profile');
      return;
    }
    fetchUserProfile();
    fetchFriendshipStatus();
  }, [userId, user]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user's public events
      const { data: eventsData, error: eventsError } = await supabase
        .from('event_participants')
        .select(`
          event_id,
          events!inner(*)
        `)
        .eq('user_id', userId)
        .eq('events.is_private', false);

      if (eventsError) throw eventsError;

      const eventsList = eventsData
        .map(ep => ep.events)
        .filter(event => event !== null)
        .map(event => ({
          id: event.id,
          title: event.title,
          category: event.category,
          location: event.location,
          date: event.date,
          time: event.time,
          price: String(event.price || 0),
          description: event.description || '',
          imageUrl: event.image_url || '',
          attendees: [],
          state: event.state,
          city: event.city,
          isRecurring: event.is_recurring || false,
        }));

      setEvents(eventsList);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendshipStatus = async () => {
    if (!user || !userId) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setFriendshipStatus('none');
      } else if (data.status === 'accepted') {
        setFriendshipStatus('accepted');
      } else if (data.user_id === user.id) {
        setFriendshipStatus('pending_sent');
      } else {
        setFriendshipStatus('pending_received');
      }
    } catch (error) {
      console.error('Error fetching friendship status:', error);
    }
  };

  const handleFriendshipAction = async () => {
    if (!user || !userId) return;

    try {
      if (friendshipStatus === 'none') {
        // Send friend request
        const { error } = await supabase
          .from('friendships')
          .insert({
            user_id: user.id,
            friend_id: userId,
            status: 'pending'
          });

        if (error) throw error;
        setFriendshipStatus('pending_sent');
        toast.success('Solicitação de amizade enviada!');
      } else if (friendshipStatus === 'pending_received') {
        // Accept friend request
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('user_id', userId)
          .eq('friend_id', user.id);

        if (error) throw error;
        setFriendshipStatus('accepted');
        toast.success('Solicitação aceita!');
      } else if (friendshipStatus === 'accepted' || friendshipStatus === 'pending_sent') {
        // Remove friendship
        const { error } = await supabase
          .from('friendships')
          .delete()
          .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);

        if (error) throw error;
        setFriendshipStatus('none');
        toast.success('Amizade removida');
      }
    } catch (error) {
      console.error('Error handling friendship:', error);
      toast.error('Erro ao processar solicitação');
    }
  };

  const isEventCompleted = (event: Event) => {
    if (event.isRecurring) return false;
    const eventDateTime = parseISO(`${event.date}T${event.time}`);
    const completionTime = addHours(eventDateTime, 24);
    return isBefore(completionTime, new Date());
  };

  const upcomingEvents = events.filter(e => !isEventCompleted(e));
  const completedEvents = events.filter(e => isEventCompleted(e));

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Perfil não encontrado</p>
        </div>
      </div>
    );
  }

  const getFriendshipButton = () => {
    switch (friendshipStatus) {
      case 'none':
        return (
          <Button onClick={handleFriendshipAction} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Adicionar Amigo
          </Button>
        );
      case 'pending_sent':
        return (
          <Button onClick={handleFriendshipAction} variant="outline" className="gap-2">
            <UserCheck className="w-4 h-4" />
            Solicitação Enviada
          </Button>
        );
      case 'pending_received':
        return (
          <Button onClick={handleFriendshipAction} className="gap-2">
            <UserCheck className="w-4 h-4" />
            Aceitar Solicitação
          </Button>
        );
      case 'accepted':
        return (
          <Button onClick={handleFriendshipAction} variant="destructive" className="gap-2">
            <UserMinus className="w-4 h-4" />
            Remover Amigo
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8 pb-24 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold mb-2">{profile.full_name}</h1>
                {profile.city && (
                  <p className="text-muted-foreground mb-4">{profile.city}</p>
                )}
                
                {profile.interests && profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {profile.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {getFriendshipButton()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            {upcomingEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum evento próximo
              </p>
            ) : (
              <div className="grid gap-4">
                {upcomingEvents.map((event) => (
                  <Card 
                    key={event.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {event.imageUrl && (
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{event.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {event.location}
                          </p>
                          <div className="flex gap-2 text-sm">
                            <Badge variant="secondary">{event.category}</Badge>
                            <Badge variant="outline">A realizar</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {completedEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum evento concluído
              </p>
            ) : (
              <div className="grid gap-4">
                {completedEvents.map((event) => (
                  <Card 
                    key={event.id}
                    className="cursor-pointer hover:shadow-md transition-shadow opacity-75"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {event.imageUrl && (
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-20 h-20 object-cover rounded grayscale"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{event.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {event.location}
                          </p>
                          <div className="flex gap-2 text-sm">
                            <Badge variant="secondary">{event.category}</Badge>
                            <Badge variant="outline">Concluído</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNavigation />
    </div>
  );
}