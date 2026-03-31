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
import { ArrowLeft, UserPlus, UserMinus, UserCheck, MessageCircle } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { ReportButton } from '@/components/reports';
import { ReputationSection, TrustScoreBadge, computeTrustScore5 } from '@/components/reputation';
import { useUserReputation } from '@/hooks/useUserReputation';
import { useConversations } from '@/hooks/useDirectMessages';
import { toast } from 'sonner';
import { parseISO, addHours, isBefore } from 'date-fns';
import type { Event } from '@/types';

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  interests: string[] | null;
  verified?: boolean;
  business_verified?: boolean;
  bio?: string;
}

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startConversation } = useConversations();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [loading, setLoading] = useState(true);
  const [activePenalties, setActivePenalties] = useState<{ penalty_type: string; reason: string; expires_at: string | null }[]>([]);
  const { stats, reviews: reputationReviews, badges, loading: loadingReputation } = useUserReputation(userId);

  useEffect(() => {
    if (!userId || userId === user?.id) {
      navigate('/?tab=profile');
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
          participantsCount: 0,
          state: event.state,
          city: event.city,
          isRecurring: event.is_recurring || false,
        }));

      setEvents(eventsList);

      // Fetch active penalties visible to the user
      const { data: penaltiesData } = await supabase
        .from('user_penalties')
        .select('penalty_type, reason, expires_at')
        .eq('user_id', userId)
        .eq('is_active', true);
      setActivePenalties(penaltiesData || []);
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
        // Check for existing friendship first
        const { data: existing } = await supabase
          .from('friendships')
          .select('id, status')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
          .maybeSingle();

        if (existing) {
          // Refresh status instead of inserting duplicate
          await fetchFriendshipStatus();
          toast.info('Solicitação já existe');
          return;
        }

        // Send friend request
        const { error } = await supabase
          .from('friendships')
          .insert({
            user_id: user.id,
            friend_id: userId,
            status: 'pending'
          });

        if (error) {
          console.error('Friend request insert error:', JSON.stringify(error));
          throw error;
        }
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
    } catch (error: any) {
      console.error('Error handling friendship:', JSON.stringify(error));
      toast.error(error?.message || 'Erro ao processar solicitação');
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
                <h1 className="text-2xl font-bold mb-1 flex items-center justify-center md:justify-start gap-1.5">
                  {profile.full_name}
                  <VerifiedBadge verified={profile.verified} businessVerified={profile.business_verified} />
                </h1>
                {profile.bio && (
                  <p className="text-sm text-muted-foreground italic mb-2">"{profile.bio}"</p>
                )}
                {stats && (
                  <div className="mb-2 flex justify-center md:justify-start">
                    <TrustScoreBadge
                      score={computeTrustScore5(stats.average_overall, stats.events_attended, stats.total_reviews)}
                      totalReviews={stats.total_reviews}
                      size="md"
                    />
                  </div>
                )}
                {profile.city && (
                  <p className="text-muted-foreground mb-2">{profile.city}</p>
                )}

                {/* Stats */}
                {stats && (
                  <div className="flex gap-4 mb-3 justify-center md:justify-start text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{stats.events_attended}</strong> participações</span>
                    <span><strong className="text-foreground">{stats.total_reviews}</strong> avaliações</span>
                  </div>
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

              <div className="flex gap-2 flex-col sm:flex-row">
                {getFriendshipButton()}
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={async () => {
                    if (!userId) return;
                    const convId = await startConversation(userId);
                    if (convId) {
                      navigate(`/?tab=messages&conv=${convId}&userId=${userId}`);
                    } else {
                      toast.error('Erro ao iniciar conversa');
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar Mensagem
                </Button>
                <ReportButton
                  reportedUserId={userId}
                  contextLabel={`Denunciar perfil: ${profile.full_name}`}
                  showLabel
                  variant="outline"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {activePenalties.length > 0 && (
          <Card className="mb-4 border-destructive/30">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Restrições ativas
              </h3>
              <div className="space-y-2">
                {activePenalties.map((p, i) => {
                  const labels: Record<string, string> = {
                    warning: 'Advertência', suspension: 'Conta suspensa', ban: 'Conta banida',
                    feature_block: 'Função bloqueada', reputation_loss: 'Reputação reduzida',
                  };
                  return (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">{labels[p.penalty_type] || p.penalty_type}</Badge>
                      {p.expires_at && (
                        <span className="text-xs text-muted-foreground">
                          até {new Date(p.expires_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="reputation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reputation">Reputação</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="reputation" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <ReputationSection stats={stats} reviews={reputationReviews} badges={badges} loading={loadingReputation} />
              </CardContent>
            </Card>
          </TabsContent>

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
                    onClick={() => navigate(`/?tab=home&event=${event.id}`)}
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
                    onClick={() => navigate(`/?tab=home&event=${event.id}`)}
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