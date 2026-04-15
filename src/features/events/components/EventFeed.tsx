import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flame, MapPin, TrendingUp, CalendarDays, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import {
  useForYouEvents,
  useNearbyFeedEvents,
  usePopularEvents,
  useTodayEvents,
} from '../hooks/useEventDiscovery';
import { EventCard } from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/skeletons/EventCardSkeleton';
import { Button } from '@/components/ui/button';
import type { Event } from '@/types';

interface EventFeedProps {
  onEventClick: (event: Event) => void;
  onCreateEvent?: () => void;
}

// ─── Section Component ────────────────────────────────────

const FeedSection = ({
  icon: Icon,
  title,
  events,
  isLoading,
  onEventClick,
  emptyText,
  iconColor = 'text-primary',
}: {
  icon: React.ElementType;
  title: string;
  events: Event[];
  isLoading: boolean;
  onEventClick: (event: Event) => void;
  emptyText?: string;
  iconColor?: string;
}) => {
  if (!isLoading && events.length === 0 && !emptyText) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {!isLoading && events.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{events.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <EventCardSkeleton key={i} variant="compact" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground pl-7">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {events.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
            >
              <EventCard event={event} variant="compact" onEventClick={onEventClick} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Main Feed ────────────────────────────────────────────

export const EventFeed = ({ onEventClick, onCreateEvent }: EventFeedProps) => {
  const { user, profile } = useAuth();
  const { city } = useGeolocation();

  const interests = profile?.interests || [];

  const forYou = useForYouEvents(interests, 8);
  const nearby = useNearbyFeedEvents(city, 8);
  const popular = usePopularEvents(8);
  const todayEvents = useTodayEvents(8);

  // Pull-to-refresh
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleRefresh = useCallback(() => {
    forYou.refetch();
    nearby.refetch();
    popular.refetch();
    todayEvents.refetch();
  }, [forYou, nearby, popular, todayEvents]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isPulling.current) {
        const diff = e.changedTouches[0].clientY - startY.current;
        if (diff > 80) handleRefresh();
        isPulling.current = false;
      }
    },
    [handleRefresh]
  );

  const allEmpty =
    !forYou.isLoading &&
    !nearby.isLoading &&
    !popular.isLoading &&
    !todayEvents.isLoading &&
    (forYou.data?.length || 0) === 0 &&
    (nearby.data?.length || 0) === 0 &&
    (popular.data?.length || 0) === 0 &&
    (todayEvents.data?.length || 0) === 0;

  return (
    <div
      ref={containerRef}
      className="space-y-6 pb-24"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div className="flex justify-center">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          aria-label="Atualizar feed"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Puxe para atualizar
        </button>
      </div>

      {/* Acontecendo Hoje */}
      <FeedSection
        icon={CalendarDays}
        title="Acontecendo hoje"
        events={todayEvents.data || []}
        isLoading={todayEvents.isLoading}
        onEventClick={onEventClick}
        iconColor="text-coral-500"
        emptyText="Nenhum evento acontecendo hoje"
      />

      {/* Para Você */}
      <FeedSection
        icon={Flame}
        title="Para você"
        events={forYou.data || []}
        isLoading={forYou.isLoading}
        onEventClick={onEventClick}
        iconColor="text-warning"
        emptyText={
          interests.length === 0
            ? 'Adicione interesses no perfil para recomendações!'
            : 'Nenhum evento encontrado para seus interesses'
        }
      />

      {/* Perto de Você */}
      <FeedSection
        icon={MapPin}
        title="Perto de você"
        events={nearby.data || []}
        isLoading={nearby.isLoading}
        onEventClick={onEventClick}
        iconColor="text-info"
        emptyText={!city ? 'Ative a localização para ver eventos próximos' : undefined}
      />

      {/* Populares Agora */}
      <FeedSection
        icon={TrendingUp}
        title="Populares agora"
        events={popular.data || []}
        isLoading={popular.isLoading}
        onEventClick={onEventClick}
        iconColor="text-success"
      />

      {/* Global empty state */}
      {allEmpty && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Nenhum evento por aqui ainda
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            Seja o primeiro a criar uma atividade e reunir pessoas!
          </p>
          {onCreateEvent && (
            <Button onClick={onCreateEvent} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar evento
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
};
