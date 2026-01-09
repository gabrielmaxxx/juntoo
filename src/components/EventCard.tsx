import { Event } from '@/types';
import { MapPin, Clock, Users, Tag, Star, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/lazy-image';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  variant?: 'default' | 'compact' | 'featured';
  onEventClick?: (event: Event) => void;
  isPinned?: boolean;
  onTogglePin?: (eventId: string) => void;
  showPinButton?: boolean;
}

export const EventCard = ({ 
  event, 
  variant = 'default', 
  onEventClick,
  isPinned = false,
  onTogglePin,
  showPinButton = false
}: EventCardProps) => {
  // Use pre-loaded rating data from event props
  const averageRating = event.averageRating ?? null;
  const reviewCount = event.reviewCount ?? 0;

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
      <article 
        className="relative w-80 h-48 rounded-2xl overflow-hidden juntoo-shadow cursor-pointer transition-juntoo hover:scale-[1.02] focus-highlight"
        onClick={() => onEventClick?.(event)}
        onKeyDown={(e) => e.key === 'Enter' && onEventClick?.(event)}
        tabIndex={0}
        role="button"
        aria-label={`Evento: ${event.title}. Local: ${event.location}${averageRating ? `. Avaliação: ${averageRating.toFixed(1)} estrelas` : ''}`}
      >
        <LazyImage 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-primary-foreground">
          <h3 className="font-bold text-lg mb-1">{event.title}</h3>
          {event.subtitle && (
            <p className="text-sm opacity-90 mb-2">{event.subtitle}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm opacity-90">
              <MapPin className="w-4 h-4 mr-1" aria-hidden="true" />
              <span>{event.location}</span>
            </div>
            {averageRating !== null && averageRating > 0 && (
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
        {event.isTrending && (
          <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full font-medium" aria-label="Evento em alta">
            🔥 Em Alta
          </div>
        )}
      </article>
    );
  }

  if (variant === 'compact') {
    const handlePinClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin?.(event.id);
    };

    return (
      <article 
        className={cn(
          "bg-card rounded-xl juntoo-shadow p-3 sm:p-4 cursor-pointer transition-juntoo hover:juntoo-shadow-elevated relative",
          isPinned && "ring-2 ring-primary/30"
        )}
        onClick={() => onEventClick?.(event)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onEventClick?.(event)}
        aria-label={`${event.title} em ${event.location}`}
      >
        {isPinned && (
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
            <Pin className="w-3 h-3" aria-hidden="true" />
          </div>
        )}
        <div className="flex space-x-2 sm:space-x-3">
          <LazyImage 
            src={event.imageUrl} 
            alt={event.title}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex-shrink-0"
            aspectRatio="square"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2">{event.title}</h3>
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground mt-1">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{formatDate(event.date, event.time)}</span>
            </div>
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-primary mr-1 flex-shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-muted-foreground">{event.attendees.length}</span>
            </div>
            {averageRating !== null && averageRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm text-muted-foreground">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showPinButton && (
              <button
                onClick={handlePinClick}
                className={cn(
                  "p-1.5 rounded-full transition-colors focus-highlight",
                  isPinned 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-label={isPinned ? "Desafixar evento" : "Fixar evento"}
                aria-pressed={isPinned}
              >
                <Pin className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            {event.creatorAvatar && (
              <LazyImage 
                src={event.creatorAvatar} 
                alt={event.creatorName || 'Criador'}
                className="w-6 h-6 rounded-full flex-shrink-0"
                aspectRatio="square"
                showSkeleton={false}
              />
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article 
      className="bg-card rounded-2xl juntoo-shadow overflow-hidden cursor-pointer transition-juntoo hover:juntoo-shadow-elevated"
      onClick={() => onEventClick?.(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEventClick?.(event)}
      aria-label={`${event.title} em ${event.location}`}
    >
      <div className="relative">
        <LazyImage 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-40"
          aspectRatio="video"
        />
        {event.distance && (
          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-primary text-xs px-2 py-1 rounded-full font-medium">
            {event.distance}
          </div>
        )}
        {event.isTrending && (
          <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full font-medium">
            🔥 Em Alta
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-foreground text-lg">{event.title}</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0">
            {event.category}
          </span>
        </div>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
            <span>{formatDate(event.date, event.time)}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center">
            <Tag className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
            <span>{event.price}</span>
          </div>
        </div>

        {event.friendsGoing && event.friendsGoing.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground mb-1">Seus amigos vão:</p>
            <p className="text-sm font-medium text-primary">{event.friendsGoing.join(', ')}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <Users className="w-4 h-4 text-primary mr-1" aria-hidden="true" />
              <span className="text-sm text-muted-foreground">{event.attendees.length}</span>
            </div>
            {averageRating !== null && averageRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="text-sm text-muted-foreground font-medium">
                  {averageRating.toFixed(1)} ({reviewCount})
                </span>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm">
            Participar
          </Button>
        </div>
      </div>
    </article>
  );
};
