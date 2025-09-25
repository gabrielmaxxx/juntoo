import { Event } from '@/types';
import { MapPin, Clock, Users, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventCardProps {
  event: Event;
  variant?: 'default' | 'compact' | 'featured';
  onEventClick?: (event: Event) => void;
}

export const EventCard = ({ event, variant = 'default', onEventClick }: EventCardProps) => {
  const formatDate = (date: string, time: string) => {
    const eventDate = new Date(`${date}T${time}`);
    return eventDate.toLocaleDateString('pt-BR', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short' 
    });
  };

  if (variant === 'featured') {
    return (
      <div 
        className="relative w-80 h-48 rounded-2xl overflow-hidden juntoo-shadow cursor-pointer transition-juntoo hover:scale-[1.02]"
        onClick={() => onEventClick?.(event)}
      >
        <img 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg mb-1">{event.title}</h3>
          {event.subtitle && (
            <p className="text-sm opacity-90 mb-2">{event.subtitle}</p>
          )}
          <div className="flex items-center text-sm opacity-90">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{event.location}</span>
          </div>
        </div>
        {event.isTrending && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            🔥 Em Alta
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div 
        className="bg-white rounded-xl juntoo-shadow p-4 cursor-pointer transition-juntoo hover:juntoo-shadow-elevated"
        onClick={() => onEventClick?.(event)}
      >
        <div className="flex space-x-3">
          <img 
            src={event.imageUrl} 
            alt={event.title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Clock className="w-4 h-4 mr-1" />
              <span>{formatDate(event.date, event.time)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </div>
        {event.attendees.length > 0 && (
          <div className="flex items-center mt-3 pt-3 border-t border-gray-100">
            <Users className="w-4 h-4 text-primary mr-1" />
            <span className="text-sm text-gray-600">{event.attendees.length} pessoas vão</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-2xl juntoo-shadow overflow-hidden cursor-pointer transition-juntoo hover:juntoo-shadow-elevated"
      onClick={() => onEventClick?.(event)}
    >
      <div className="relative">
        <img 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-40 object-cover"
        />
        {event.distance && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-primary text-xs px-2 py-1 rounded-full font-medium">
            {event.distance}
          </div>
        )}
        {event.isTrending && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            🔥 Em Alta
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0">
            {event.category}
          </span>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-primary" />
            <span>{formatDate(event.date, event.time)}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center">
            <Tag className="w-4 h-4 mr-2 text-primary" />
            <span>{event.price}</span>
          </div>
        </div>

        {event.friendsGoing && event.friendsGoing.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Seus amigos vão:</p>
            <p className="text-sm font-medium text-primary">{event.friendsGoing.join(', ')}</p>
          </div>
        )}

        {event.attendees.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <Users className="w-4 h-4 text-primary mr-1" />
              <span className="text-sm text-gray-600">{event.attendees.length} pessoas vão</span>
            </div>
            <Button variant="outline" size="sm">
              Participar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};