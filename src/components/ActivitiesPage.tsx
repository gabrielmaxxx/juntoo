import { useState } from 'react';
import { Event, User } from '@/types';
import { EventCard } from '@/components/EventCard';
import { ActivityDetails } from '@/components/ActivityDetails';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, Plus } from 'lucide-react';

interface ActivitiesPageProps {
  events: Event[];
  currentUser: User;
  onEventClick: (event: Event) => void;
}

export const ActivitiesPage = ({ events, currentUser, onEventClick }: ActivitiesPageProps) => {
  const [selectedActivity, setSelectedActivity] = useState<Event | null>(null);

  // Filter events for registered and created by user
  const registeredEvents = currentUser.eventsRegistered || [];
  const createdEvents = events.filter(event => event.createdBy === currentUser.name);

  const handleActivityClick = (event: Event) => {
    setSelectedActivity(event);
  };

  const handleBackToList = () => {
    setSelectedActivity(null);
  };

  if (selectedActivity) {
    return (
      <ActivityDetails 
        event={selectedActivity} 
        onBack={handleBackToList}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="h-full bg-gradient-to-b from-background to-background/50">
      {/* Header */}
      <div className="bg-white border-b border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-foreground">Minhas Atividades</h1>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
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
                <Button className="mt-4" size="sm">
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