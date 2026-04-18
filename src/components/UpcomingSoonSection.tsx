import { motion } from 'framer-motion';
import { Zap, Clock, MapPin } from 'lucide-react';
import { Event } from '@/types';
import { LazyImage } from '@/components/ui/lazy-image';
import { useEventCountdown } from '@/hooks/useEventCountdown';

interface UpcomingSoonSectionProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

const SoonCard = ({ event, onClick }: { event: Event; onClick: () => void }) => {
  const { label, isImminent, isLive } = useEventCountdown(event.date, event.time);

  return (
    <motion.article
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className="flex-shrink-0 w-64 bg-card rounded-2xl overflow-hidden cursor-pointer relative"
      style={{ boxShadow: 'var(--shadow-card)' }}
      aria-label={`${event.title} — ${label}`}
    >
      <div className="relative h-32">
        <LazyImage src={event.imageUrl} alt={event.title} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden="true" />
        <div
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 backdrop-blur-sm ${
            isLive
              ? 'bg-destructive text-destructive-foreground animate-pulse'
              : isImminent
                ? 'bg-warning/90 text-warning-foreground'
                : 'bg-primary/90 text-primary-foreground'
          }`}
        >
          {isLive ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {label}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1">{event.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 line-clamp-1">
          <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          {event.location}
        </p>
      </div>
    </motion.article>
  );
};

export const UpcomingSoonSection = ({ events, onEventClick }: UpcomingSoonSectionProps) => {
  if (events.length === 0) return null;

  return (
    <section aria-label="Acontecendo em breve">
      <div className="px-5 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning" aria-hidden="true" />
          <h2 className="text-base font-bold text-foreground">Acontecendo em breve</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-7">Próximas 48h na sua cidade</p>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 px-5 pb-2">
          {events.map((event) => (
            <SoonCard key={event.id} event={event} onClick={() => onEventClick(event)} />
          ))}
        </div>
      </div>
    </section>
  );
};
