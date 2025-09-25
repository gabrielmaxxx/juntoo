import { Event } from '@/types';
import { Calendar, MapPin, Tag, Users, Share2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { USERS } from '@/data/mockData';
import { UserAvatar } from './UserAvatar';

interface EventDetailsProps {
  event: Event;
  onBack: () => void;
}

export const EventDetails = ({ event, onBack }: EventDetailsProps) => {
  const formatDateTime = (date: string, time: string) => {
    const eventDate = new Date(`${date}T${time}`);
    return eventDate.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAttendeeUsers = () => {
    return event.attendees
      .map(name => USERS.find(user => user.name === name))
      .filter(Boolean) as any[];
  };

  const attendeeUsers = getAttendeeUsers();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Hero Image */}
      <div className="relative w-full h-64 flex-shrink-0">
        <img 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute top-4 left-4 bg-black/20 text-white hover:bg-black/40"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        {/* Share Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-black/20 text-white hover:bg-black/40"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto bg-white rounded-t-2xl -mt-4 z-10 relative">
        {/* Event Title and Category */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900 flex-1 pr-4 font-poppins">
              {event.title}
            </h1>
            <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-medium flex-shrink-0">
              {event.category}
            </span>
          </div>
          {event.subtitle && (
            <p className="text-gray-600 font-medium">{event.subtitle}</p>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-3">
          <div className="flex items-center text-gray-700">
            <Calendar className="w-5 h-5 mr-3 text-primary" />
            <span>{formatDateTime(event.date, event.time)}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <MapPin className="w-5 h-5 mr-3 text-primary" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <Tag className="w-5 h-5 mr-3 text-primary" />
            <span className="font-medium">{event.price}</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Sobre o evento</h3>
          <p className="text-gray-700 leading-relaxed">{event.description}</p>
        </div>

        {/* Attendees */}
        {attendeeUsers.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">
              Quem vai? ({attendeeUsers.length})
            </h3>
            <div className="flex items-center -space-x-2">
              {attendeeUsers.slice(0, 5).map((user, index) => (
                <div key={user.id} className="relative" style={{ zIndex: 5 - index }}>
                  <UserAvatar user={user} size="md" />
                </div>
              ))}
              {attendeeUsers.length > 5 && (
                <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-sm font-medium text-gray-600">
                  +{attendeeUsers.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comments Preview */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Comentários</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <UserAvatar user={USERS[0]} size="sm" />
              <div className="flex-1">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">{USERS[0].name}:</span> Alguma sugestão de onde estacionar?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 bg-white border-t border-gray-200">
        <Button variant="hero" className="w-full">
          Participar
        </Button>
      </div>
    </div>
  );
};