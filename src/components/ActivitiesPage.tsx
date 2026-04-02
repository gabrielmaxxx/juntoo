import { useState } from 'react';
import { Event } from '@/types';
import { EventCard } from '@/components/EventCard';
import { EventDetails } from '@/components/EventDetails';
import { CreatorDashboard } from '@/components/CreatorDashboard';
import { EventDashboard } from '@/components/EventDashboard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, Plus, BarChart3 } from 'lucide-react';
import { usePinnedEvents } from '@/hooks/usePinnedEvents';
import { useUserRegisteredEvents, useUserCreatedEvents } from '@/hooks/useUserEvents';
import { useAuthContext } from '@/contexts/AuthContext';
import { QueryErrorState } from '@/components/QueryErrorState';

interface ActivitiesPageProps {
  onEventClick: (event: Event) => void;
  onCreateClick?: () => void;
}

export const ActivitiesPage = ({ onEventClick, onCreateClick }: ActivitiesPageProps) => {
  const [selectedActivity, setSelectedActivity] = useState<Event | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedEventDashboard, setSelectedEventDashboard] = useState<string | null>(null);
  const { user } = useAuthContext();
  const { isPinned, togglePin } = usePinnedEvents();
  
  const { data: registeredEvents = [], isLoading: loadingRegistered, isError: registeredError, refetch: refetchRegistered } = useUserRegisteredEvents(user?.id);
  const { data: createdEvents = [], isLoading: loadingCreated, isError: createdError, refetch: refetchCreated } = useUserCreatedEvents(user?.id);
  
  const loading = loadingRegistered || loadingCreated;
  const hasError = registeredError || createdError;

  // Helper function to check if event is completed
  const isEventCompleted = (event: Event): boolean => {
    // Recurring events are never considered completed
    if (event.isRecurring) return false;
    
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const twentyFourHoursAfter = new Date(eventDateTime.getTime() + 24 * 60 * 60 * 1000);
    
    return now > twentyFourHoursAfter;
  };

  // Sort events with pinned first
  const sortByPinned = (events: Event[]) => {
    return [...events].sort((a, b) => {
      const aPinned = isPinned(a.id);
      const bPinned = isPinned(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  };

  // Separate events into upcoming and completed, sorted by pinned
  const upcomingRegistered = sortByPinned(registeredEvents.filter(e => !isEventCompleted(e)));
  const completedRegistered = sortByPinned(registeredEvents.filter(e => isEventCompleted(e)));
  const upcomingCreated = sortByPinned(createdEvents.filter(e => !isEventCompleted(e)));
  const completedCreated = sortByPinned(createdEvents.filter(e => isEventCompleted(e)));

  const handleActivityClick = (event: Event) => {
    setSelectedActivity(event);
  };

  const handleBackToList = () => {
    setSelectedActivity(null);
  };

  if (selectedEventDashboard) {
    return (
      <EventDashboard 
        eventId={selectedEventDashboard} 
        onBack={() => setSelectedEventDashboard(null)} 
      />
    );
  }

  if (showDashboard) {
    return (
      <CreatorDashboard 
        onBack={() => setShowDashboard(false)} 
        onEventDashboardClick={(eventId) => setSelectedEventDashboard(eventId)}
      />
    );
  }

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
          <div className="h-12 bg-muted rounded-lg"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-4">
        <QueryErrorState 
          message="Não foi possível carregar suas atividades." 
          onRetry={() => { refetchRegistered(); refetchCreated(); }} 
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-b from-background to-background/50">
      {/* Header */}
      <div className="bg-card border-b border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-foreground">Minhas Atividades</h1>
          <div className="flex gap-2">
            {createdEvents.length > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowDashboard(true)}
                aria-label="Ver dashboard de estatísticas"
              >
                <BarChart3 className="w-4 h-4 mr-2" aria-hidden="true" />
                Dashboard
              </Button>
            )}
            <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={onCreateClick}>
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Criar
            </Button>
          </div>
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
          <TabsList className="grid grid-cols-2 mx-4 mt-4 mb-2 w-[calc(100%-2rem)]">
            <TabsTrigger value="registered" className="text-sm">
              Inscrições ({registeredEvents.length})
            </TabsTrigger>
            <TabsTrigger value="created" className="text-sm">
              Criadas ({createdEvents.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="registered" className="flex-1 overflow-y-auto px-4 pb-24">
            {registeredEvents.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-9 h-9 text-primary" />}
                emoji="🎯"
                title="Sua agenda está livre!"
                description="Descubra eventos incríveis e conheça pessoas novas. Sua próxima experiência está a um toque."
                actionLabel="Explorar eventos"
                onAction={() => onCreateClick?.()}
              />
            ) : (
              <div className="space-y-6">
                {/* Upcoming Events */}
                {upcomingRegistered.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Próximos</h3>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {upcomingRegistered.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {upcomingRegistered.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onEventClick={() => handleActivityClick(event)}
                          variant="compact"
                          isPinned={isPinned(event.id)}
                          onTogglePin={togglePin}
                          showPinButton={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Events */}
                {completedRegistered.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold text-muted-foreground">Concluídos</h3>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {completedRegistered.length}
                      </span>
                    </div>
                    <div className="space-y-3 opacity-60">
                      {completedRegistered.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onEventClick={() => handleActivityClick(event)}
                          variant="compact"
                          isPinned={isPinned(event.id)}
                          onTogglePin={togglePin}
                          showPinButton={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="created" className="flex-1 overflow-y-auto px-4 pb-24">
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
              <div className="space-y-6">
                {/* Upcoming Events */}
                {upcomingCreated.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Próximos</h3>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {upcomingCreated.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {upcomingCreated.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onEventClick={() => handleActivityClick(event)}
                          variant="compact"
                          isPinned={isPinned(event.id)}
                          onTogglePin={togglePin}
                          showPinButton={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Events */}
                {completedCreated.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold text-muted-foreground">Concluídos</h3>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {completedCreated.length}
                      </span>
                    </div>
                    <div className="space-y-3 opacity-60">
                      {completedCreated.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onEventClick={() => handleActivityClick(event)}
                          variant="compact"
                          isPinned={isPinned(event.id)}
                          onTogglePin={togglePin}
                          showPinButton={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
