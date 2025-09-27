import { Event, User } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/UserAvatar';
import { ArrowLeft, MapPin, Calendar, Clock, Users, MessageCircle, Settings } from 'lucide-react';
import { USERS } from '@/data/mockData';

interface ActivityDetailsProps {
  event: Event;
  onBack: () => void;
  currentUser: User;
}

export const ActivityDetails = ({ event, onBack, currentUser }: ActivityDetailsProps) => {
  const formatDateTime = (date: string, time: string) => {
    const eventDate = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    return `${eventDate.toLocaleDateString('pt-BR', options)} às ${time}`;
  };

  const getAttendeeUsers = (): User[] => {
    return event.attendees.map(name => 
      USERS.find(user => user.name === name) || {
        id: name,
        name,
        email: `${name.toLowerCase()}@example.com`,
        avatarUrl: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
        bio: `Usuário ${name}`,
        rating: 4.5,
        reviews: 0,
        location: 'Local não informado',
        interests: [],
        badges: [],
        posts: [],
        registeredEvents: [],
        attendedEvents: []
      }
    );
  };

  const isCreatedByUser = event.createdBy === currentUser.name;

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          {isCreatedByUser && (
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Gerenciar
            </Button>
          )}
        </div>
        
        <h1 className="text-xl font-bold text-foreground mb-1">{event.title}</h1>
        <p className="text-sm text-muted-foreground">{event.category}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Event Image */}
          <div className="aspect-video rounded-xl overflow-hidden">
            <img 
              src={event.imageUrl} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Event Info */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Data e horário</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(event.date, event.time)}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Local</p>
                <p className="text-sm text-muted-foreground">{event.location}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Preço</p>
                <p className="text-sm text-muted-foreground">{event.price}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="font-semibold text-foreground mb-2">Sobre o evento</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          </div>

          <Separator />

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Participantes ({event.attendees.length})
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {getAttendeeUsers().map((user, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <UserAvatar user={user} size="sm" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{user.name}</p>
                    {user.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{user.bio}</p>
                    )}
                  </div>
                  {user.name === currentUser.name && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Você
                    </span>
                  )}
                  {event.createdBy === user.name && (
                    <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded-full">
                      Organizador
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Chat Section - Placeholder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat do grupo
              </h3>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-6 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h4 className="font-medium text-foreground mb-2">Chat em desenvolvimento</h4>
              <p className="text-sm text-muted-foreground">
                Esta funcionalidade requer integração com backend para armazenar e sincronizar mensagens em tempo real.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Action Button */}
      <div className="p-4 bg-white border-t border-border/50">
        {isCreatedByUser ? (
          <Button className="w-full bg-secondary hover:bg-secondary/90">
            <Settings className="w-4 h-4 mr-2" />
            Gerenciar Evento
          </Button>
        ) : (
          <Button className="w-full">
            <MessageCircle className="w-4 h-4 mr-2" />
            Abrir Chat
          </Button>
        )}
      </div>
    </div>
  );
};