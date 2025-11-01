import { useState, useEffect } from 'react';
import { Event, User } from '@/types';
import { EventCard } from '@/components/EventCard';
import { EventDetails } from '@/components/EventDetails';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ActivitiesPageProps {
  currentUser: User;
  onEventClick: (event: Event) => void;
  onCreateClick?: () => void;
}

export const ActivitiesPage = ({ currentUser, onEventClick, onCreateClick }: ActivitiesPageProps) => {
  const [selectedActivity, setSelectedActivity] = useState<Event | null>(null);
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserEvents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch events where user is participant
        const { data: participantData, error: participantError } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', user.id);

        if (participantError) throw participantError;

        const eventIds = participantData?.map(p => p.event_id) || [];

        if (eventIds.length > 0) {
          const { data: eventsData, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .in('id', eventIds);

          if (eventsError) throw eventsError;

          const transformedEvents: Event[] = await Promise.all(
            (eventsData || []).map(async (event) => {
              // Get participants for each event
              const { data: participants } = await supabase
                .from('event_participants')
                .select('user_id')
                .eq('event_id', event.id);

              // Get creator profile
              const { data: creatorProfile } = await supabase
                .from('profiles')
                .select('avatar_url, full_name')
                .eq('user_id', event.created_by)
                .single();

              return {
                id: event.id,
                title: event.title,
                category: event.category,
                location: event.location,
                date: event.date,
                time: event.time,
                price: event.price?.toString() || 'Gratuito',
                description: event.description || '',
                imageUrl: event.image_url || 'https://images.pexels.com/photos/1916817/pexels-photo-1916817.jpeg',
                attendees: participants?.map(p => p.user_id) || [],
                createdBy: event.created_by,
                creatorAvatar: creatorProfile?.avatar_url,
                creatorName: creatorProfile?.full_name
              };
            })
          );

          setRegisteredEvents(transformedEvents);
        }

        // Fetch events created by user
        const { data: createdData, error: createdError } = await supabase
          .from('events')
          .select('*')
          .eq('created_by', user.id);

        if (createdError) throw createdError;

        const transformedCreated: Event[] = await Promise.all(
          (createdData || []).map(async (event) => {
            // Get participants for each event
            const { data: participants } = await supabase
              .from('event_participants')
              .select('user_id')
              .eq('event_id', event.id);

            // Get creator profile
            const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('avatar_url, full_name')
              .eq('user_id', event.created_by)
              .single();

            return {
              id: event.id,
              title: event.title,
              category: event.category,
              location: event.location,
              date: event.date,
              time: event.time,
              price: event.price?.toString() || 'Gratuito',
              description: event.description || '',
              imageUrl: event.image_url || 'https://images.pexels.com/photos/1916817/pexels-photo-1916817.jpeg',
              attendees: participants?.map(p => p.user_id) || [],
              createdBy: event.created_by,
              creatorAvatar: creatorProfile?.avatar_url,
              creatorName: creatorProfile?.full_name
            };
          })
        );

        setCreatedEvents(transformedCreated);
      } catch (error) {
        console.error('Erro ao carregar eventos do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserEvents();
  }, []);

  const handleActivityClick = (event: Event) => {
    setSelectedActivity(event);
  };

  const handleBackToList = () => {
    setSelectedActivity(null);
  };

  if (selectedActivity) {
    return (
      <EventDetails 
        event={selectedActivity} 
        onBack={handleBackToList}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-b from-background to-background/50">
      {/* Header */}
      <div className="bg-white border-b border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-foreground">Minhas Atividades</h1>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={onCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            Criar
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Inscrições</p>
            <p className="font-semibold text-foreground">{registeredEvents.length}</p>
          </div>
          <div className="bg-secondary/20 rounded-xl p-3 text-center">
            <Users className="w-5 h-5 text-secondary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Criadas</p>
            <p className="font-semibold text-foreground">{createdEvents.length}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="registered" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 mb-2">
            <TabsTrigger value="registered" className="text-sm">
              Inscrições ({registeredEvents.length})
            </TabsTrigger>
            <TabsTrigger value="created" className="text-sm">
              Criadas ({createdEvents.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="registered" className="flex-1 overflow-y-auto px-4 pb-4">
            {registeredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-2">Nenhuma inscrição ainda</h3>
                <p className="text-sm text-muted-foreground">
                  Explore eventos na página inicial e se inscreva!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {registeredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventClick={() => handleActivityClick(event)}
                    variant="compact"
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="created" className="flex-1 overflow-y-auto px-4 pb-4">
            {createdEvents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-2">Nenhum evento criado</h3>
                <p className="text-sm text-muted-foreground">
                  Que tal organizar seu primeiro evento?
                </p>
                <Button className="mt-4" size="sm" onClick={onCreateClick}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Evento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {createdEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventClick={() => handleActivityClick(event)}
                    variant="compact"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};