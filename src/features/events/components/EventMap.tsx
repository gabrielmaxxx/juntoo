import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, List, Map as MapIcon, X, Users, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/EventCard';
import { Badge } from '@/components/ui/badge';
import { usePopularEvents } from '../hooks/useEventDiscovery';
import type { Event } from '@/types';

// Lazy load Leaflet only when map is shown
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMap: any;
let L: any;
let MarkerClusterGroup: any;
let leafletLoaded = false;

const loadLeaflet = async () => {
  if (leafletLoaded) return;
  const [leaflet, rl, mcg] = await Promise.all([
    import('leaflet'),
    import('react-leaflet'),
    import('leaflet.markercluster'),
  ]);
  L = leaflet.default;
  MapContainer = rl.MapContainer;
  TileLayer = rl.TileLayer;
  Marker = rl.Marker;
  Popup = rl.Popup;
  useMap = rl.useMap;

  // Import CSS
  await import('leaflet/dist/leaflet.css');
  await import('leaflet.markercluster/dist/MarkerCluster.css');
  await import('leaflet.markercluster/dist/MarkerCluster.Default.css');

  // Fix default icons
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  leafletLoaded = true;
};

// ─── Category → emoji mapping ─────────────────────────────

const categoryEmoji: Record<string, string> = {
  Esportes: '⚽',
  Música: '🎵',
  Arte: '🎨',
  Tecnologia: '💻',
  Culinária: '🍳',
  Viagem: '✈️',
  Fotografia: '📷',
  Leitura: '📚',
  Cinema: '🎬',
  Dança: '💃',
  Natureza: '🌿',
  Fitness: '💪',
  Educação: '🎓',
  Social: '🤝',
  Negócios: '💼',
  Jogos: '🎮',
};

// ─── Simple geocoding from city name → approximate coords ─

const CITY_COORDS: Record<string, [number, number]> = {
  'são paulo': [-23.5505, -46.6333],
  'rio de janeiro': [-22.9068, -43.1729],
  'belo horizonte': [-19.9167, -43.9345],
  brasília: [-15.7975, -47.8919],
  curitiba: [-25.4284, -49.2733],
  salvador: [-12.9714, -38.5124],
  fortaleza: [-3.7172, -38.5433],
  recife: [-8.0476, -34.877],
  'porto alegre': [-30.0346, -51.2177],
  manaus: [-3.119, -60.0217],
};

const getCoordsForEvent = (event: Event): [number, number] | null => {
  const city = event.city?.toLowerCase();
  if (!city) return null;
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (city.includes(key)) return coords;
  }
  // Scatter around Brazil center with some randomness for demo
  return [
    -14.235 + (Math.random() - 0.5) * 10,
    -51.9253 + (Math.random() - 0.5) * 15,
  ];
};

// ─── Map inner component (needs Leaflet loaded) ───────────

const MapInner = ({
  events,
  selectedEvent,
  onSelectEvent,
  onEventClick,
}: {
  events: Event[];
  selectedEvent: Event | null;
  onSelectEvent: (e: Event | null) => void;
  onEventClick: (e: Event) => void;
}) => {
  const eventsWithCoords = useMemo(
    () =>
      events
        .map((e) => ({ event: e, coords: getCoordsForEvent(e) }))
        .filter((e): e is { event: Event; coords: [number, number] } => e.coords !== null),
    [events]
  );

  const center: [number, number] = eventsWithCoords.length > 0
    ? eventsWithCoords[0].coords
    : [-14.235, -51.9253];

  const createIcon = (category: string) => {
    const emoji = categoryEmoji[category] || '📍';
    return L.divIcon({
      html: `<div style="
        background: hsl(186 100% 36%);
        border-radius: 50%;
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">${emoji}</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  return (
    <MapContainer
      center={center}
      zoom={5}
      className="w-full h-full rounded-xl z-0"
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {eventsWithCoords.map(({ event, coords }) => (
        <Marker
          key={event.id}
          position={coords}
          icon={createIcon(event.category)}
          eventHandlers={{
            click: () => onSelectEvent(event),
          }}
        />
      ))}
    </MapContainer>
  );
};

// ─── EventMap Component ───────────────────────────────────

interface EventMapProps {
  onEventClick: (event: Event) => void;
}

export const EventMap = ({ onEventClick }: EventMapProps) => {
  const [view, setView] = useState<'map' | 'list'>('map');
  const [leafletReady, setLeafletReady] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: events = [], isLoading } = usePopularEvents(50);

  useEffect(() => {
    loadLeaflet().then(() => setLeafletReady(true));
  }, []);

  return (
    <div className="space-y-3 pb-24">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Mapa de eventos</h2>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'map'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-secondary'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            Mapa
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-secondary'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'map' ? (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            <div className="w-full h-[60vh] rounded-xl overflow-hidden border border-border bg-muted">
              {!leafletReady || isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <MapInner
                  events={events}
                  selectedEvent={selectedEvent}
                  onSelectEvent={setSelectedEvent}
                  onEventClick={onEventClick}
                />
              )}
            </div>

            {/* Selected event preview */}
            <AnimatePresence>
              {selectedEvent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-3 left-3 right-3"
                >
                  <div className="bg-card rounded-xl shadow-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {selectedEvent.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <CalendarDays className="h-3 w-3" />
                            {selectedEvent.date}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" />
                            {selectedEvent.participantsCount}
                          </span>
                        </div>
                        <Badge variant="secondary" className="mt-1.5 text-[10px]">
                          {selectedEvent.category}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setSelectedEvent(null)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={() => onEventClick(selectedEvent)}
                        >
                          Ver
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                variant="compact"
                onEventClick={onEventClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
