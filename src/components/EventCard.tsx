import { Event } from '@/types';
import { MapPin, Clock, Users, Star, Pin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/lazy-image';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { shareEvent } from '@/lib/share';

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
        className="relative w-80 h-52 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] focus-highlight"
        style={{ boxShadow: 'var(--shadow-elevated)' }}
        onClick={() => { haptic('light'); onEventClick?.(event); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEventClick?.(event); } }}
        tabIndex={0}
        role="button"
        aria-label={`Evento: ${event.title}. Local: ${event.location}${averageRating ? `. Avaliação: ${averageRating.toFixed(1)} estrelas` : ''}`}
      >
        <LazyImage 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-full group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">{event.title}</h3>
          {event.subtitle && (
            <p className="text-sm text-white/80 mb-2 line-clamp-1">{event.subtitle}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-white/80">
              <MapPin className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
            {averageRating !== null && averageRating > 0 && (
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-white">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
        {event.isTrending && (
          <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs px-2.5 py-1 rounded-full font-semibold" aria-label="Evento em alta">
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
          "bg-card rounded-2xl p-3.5 cursor-pointer transition-all duration-200 hover:shadow-md relative",
          isPinned && "ring-2 ring-primary/30"
        )}
        style={{ boxShadow: 'var(--shadow-card)' }}
        onClick={() => { haptic('light'); onEventClick?.(event); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEventClick?.(event); } }}
        aria-label={`${event.title} em ${event.location}`}
      >
        {isPinned && (
          <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
            <Pin className="w-3 h-3" aria-hidden="true" />
          </div>
        )}
        <div className="flex gap-3.5">
          <LazyImage 
            src={event.imageUrl} 
            alt={event.title}
            className="w-16 h-16 rounded-xl flex-shrink-0"
            aspectRatio="square"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">{event.title}</h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary/70 flex-shrink-0" aria-hidden="true" />
                {formatDate(event.date, event.time)}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary/70 flex-shrink-0" aria-hidden="true" />
                <span className="truncate max-w-[100px]">{event.location}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span className="text-xs text-muted-foreground font-medium">{event.attendees.length}</span>
            </div>
            {averageRating !== null && averageRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="text-xs text-muted-foreground font-medium">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showPinButton && (
              <button
                onClick={handlePinClick}
                className={cn(
                  "p-1.5 rounded-full transition-all duration-200 focus-highlight",
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
                className="w-6 h-6 rounded-full flex-shrink-0 ring-2 ring-background"
                aspectRatio="square"
                showSkeleton={false}
              />
            )}
          </div>
        </div>
      </article>
    );
  }

  // Default variant
  return (
    <article 
      className="bg-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg group"
      style={{ boxShadow: 'var(--shadow-card)' }}
      onClick={() => { haptic('light'); onEventClick?.(event); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEventClick?.(event); } }}
      aria-label={`${event.title} em ${event.location}`}
    >
      <div className="relative">
        <LazyImage 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-48 group-hover:scale-105 transition-transform duration-700"
          aspectRatio="video"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" aria-hidden="true" />
        {event.distance && (
          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-primary text-xs px-2.5 py-1 rounded-full font-semibold">
            {event.distance}
          </div>
        )}
        {event.isTrending && (
          <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs px-2.5 py-1 rounded-full font-semibold">
            🔥 Em Alta
          </div>
        )}
        {/* Category pill on image */}
        <div className="absolute bottom-3 left-3">
          <span className="text-xs bg-white/90 backdrop-blur-sm text-foreground px-2.5 py-1 rounded-full font-medium">
            {event.category}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-foreground text-base line-clamp-1 mb-2">{event.title}</h3>
        
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
            <span>{formatDate(event.date, event.time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>

        {event.price && (
          <p className="text-sm font-semibold text-primary mt-2">{event.price}</p>
        )}

        {event.friendsGoing && event.friendsGoing.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-primary">{event.friendsGoing.join(', ')}</span> vão
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="text-xs text-muted-foreground font-medium">{event.attendees.length}</span>
            </div>
            {averageRating !== null && averageRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="text-xs text-muted-foreground font-medium">
                  {averageRating.toFixed(1)} ({reviewCount})
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); haptic('light'); shareEvent(event); }}
              className="p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
              aria-label="Compartilhar evento"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <Button variant="default" size="sm" className="rounded-xl text-xs font-semibold px-4">
              Participar
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};
