import { Calendar, MapPin, Tag, Share2, CalendarPlus } from 'lucide-react';
import { Event } from '@/types';
import { formatDateTime } from '@/hooks/useEventDetails';
import { Button } from '@/components/ui/button';
import { shareEvent } from '@/lib/share';
import { addToCalendar } from '@/lib/calendar';
import { haptic } from '@/lib/haptics';

interface EventInfoProps {
  event: Event;
}

export const EventInfo = ({ event }: EventInfoProps) => {
  const handleShare = () => {
    haptic('light');
    shareEvent(event);
  };

  const handleAddToCalendar = () => {
    haptic('success');
    addToCalendar(event);
  };

  return (
    <>
      {/* Event Title and Category */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex-1 font-poppins">
            {event.title}
          </h1>
          <span className="bg-primary/10 text-primary text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full font-medium flex-shrink-0">
            {event.category}
          </span>
        </div>
        {event.subtitle && (
          <p className="text-muted-foreground font-medium">{event.subtitle}</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleShare} className="flex-1">
          <Share2 className="w-4 h-4 mr-1.5" />
          Compartilhar
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddToCalendar} className="flex-1">
          <CalendarPlus className="w-4 h-4 mr-1.5" />
          Calendário
        </Button>
      </div>

      {/* Event Details */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center text-foreground text-sm sm:text-base">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-primary flex-shrink-0" />
          <span className="break-words">{formatDateTime(event.date, event.time)}</span>
        </div>
        <div className="flex items-center text-foreground text-sm sm:text-base">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-primary flex-shrink-0" />
          <span className="break-words">{event.location}</span>
        </div>
        <div className="flex items-center text-foreground text-sm sm:text-base">
          <Tag className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-primary flex-shrink-0" />
          <span className="font-medium">{event.price}</span>
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Sobre o evento</h3>
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{event.description}</p>
      </div>
    </>
  );
};
