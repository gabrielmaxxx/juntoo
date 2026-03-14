import { Event } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Flame, ChevronRight, ShieldCheck, MapPinned } from 'lucide-react';
import { HomePageSkeleton } from './skeletons';
import { LazyImage } from './ui/lazy-image';
import { useTrendingEvents, useFriendsEvents, useRecommendedEvents, useNearbyEvents } from '@/hooks/useEvents';
import { useGeolocation, formatDistance } from '@/hooks/useGeolocation';
import { Button } from './ui/button';

interface HomePageProps {
  onEventClick: (event: Event) => void;
  currentUser?: {
    name: string;
  };
}

export const HomePage = ({ onEventClick, currentUser }: HomePageProps) => {
  const { profile, user } = useAuth();
  const userName = currentUser?.name || 'Usuário';

  const { data: trendingEvents = [], isLoading: loadingTrending } = useTrendingEvents(5);
  const { data: friendsEvents = [], isLoading: loadingFriends } = useFriendsEvents(user?.id, 3);
  const { data: recommendedEvents = [], isLoading: loadingRecommended } = useRecommendedEvents(
    user?.id,
    profile?.interests || null,
    10
  );

  const { latitude, longitude, city: geoCity, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();
  const { data: nearbyEvents = [], isLoading: loadingNearby } = useNearbyEvents(geoCity, 10);

  const loading = loadingTrending || loadingFriends || loadingRecommended;

  const getDailyMission = () => {
    const missions = [
      { text: "Confirme presença em um evento de esportes!", category: "Esportes" },
      { text: "Participe de um evento cultural hoje!", category: "Cultura" },
      { text: "Faça um novo amigo na plataforma!", category: "Social" },
      { text: "Crie seu primeiro evento da semana!", category: "Criar" },
      { text: "Explore eventos de música perto de você!", category: "Música" },
      { text: "Participe de um evento de gastronomia!", category: "Gastronomia" },
      { text: "Conecte-se com amigos em um evento!", category: "Social" }
    ];
    
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return missions[dayOfYear % missions.length];
  };

  const dailyMission = getDailyMission();

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="space-y-8 pb-28">
      {/* Greeting */}
      <header className="px-5 pt-8 text-center">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Olá, {userName} 👋
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          O que vamos fazer hoje?
        </p>
      </header>

      {/* Daily Mission */}
      <section className="px-5" aria-label="Missão do Dia">
        <div className="juntoo-gradient rounded-2xl p-5 relative overflow-hidden animate-fade-in" style={{ boxShadow: 'var(--shadow-elevated)' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[slide-in-right_3s_ease-in-out_infinite]" aria-hidden="true" />
          
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex-1">
              <h2 className="text-primary-foreground/80 font-semibold text-xs uppercase tracking-widest mb-1.5">
                Missão do Dia
              </h2>
              <p className="text-primary-foreground text-base font-medium leading-snug">
                {dailyMission.text}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary-foreground" strokeWidth={2} aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Events */}
      {trendingEvents.length > 0 && (
        <section aria-label="Eventos em Alta">
          <div className="px-5 mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Em Alta
              <Flame className="w-5 h-5 text-destructive" aria-hidden="true" />
            </h2>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 px-5 pb-2">
              {trendingEvents.map((event) => (
                <article 
                  key={event.id} 
                  className="flex-shrink-0 w-72 cursor-pointer group"
                  onClick={() => onEventClick(event)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                  aria-label={`${event.title} em ${event.location}`}
                >
                  <div className="relative rounded-2xl overflow-hidden h-44" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <LazyImage 
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden="true" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-primary-foreground">
                      <h3 className="font-bold text-base mb-0.5 line-clamp-1">{event.title}</h3>
                      <p className="text-xs text-white/80 flex items-center gap-1">
                        <MapPinned className="w-3 h-3" aria-hidden="true" />
                        {event.location}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Friends' Events */}
      {friendsEvents.length > 0 && (
        <section className="px-5" aria-label="Eventos dos seus amigos">
          <h2 className="text-lg font-bold text-foreground mb-4">
            Seus amigos vão
          </h2>
          <div className="space-y-4">
            {friendsEvents.map((event) => (
              <article 
                key={event.id}
                onClick={() => onEventClick(event)}
                className="cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                aria-label={`${event.title} em ${event.location}`}
              >
                <div className="relative rounded-2xl overflow-hidden h-44" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <LazyImage 
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden="true" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                    <div className="text-primary-foreground">
                      <h3 className="font-bold text-base line-clamp-1">{event.title}</h3>
                      <p className="text-xs text-white/80 mt-0.5">{event.location}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/70 flex-shrink-0 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Geolocation CTA */}
      {!latitude && (
        <section className="px-5" aria-label="Ativar localização">
          <div className="bg-card rounded-2xl p-4 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPinned className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Eventos perto de você</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ative a localização para ver distâncias</p>
            </div>
            <Button size="sm" variant="outline" onClick={requestLocation} disabled={geoLoading} className="flex-shrink-0">
              {geoLoading ? 'Buscando...' : 'Ativar'}
            </Button>
          </div>
        </section>
      )}

      {/* Recommended Events */}
      <section className="px-5" aria-label="Eventos recomendados">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            Recomendado para você
            <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Com base nos seus interesses</p>
        </div>
        {recommendedEvents.length > 0 ? (
          <div className="space-y-3">
            {recommendedEvents.map((event) => (
              <article 
                key={event.id}
                onClick={() => onEventClick(event)}
                className="flex gap-4 cursor-pointer group bg-card rounded-2xl p-3 transition-all duration-200 hover:shadow-md"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                aria-label={`${event.title} em ${event.location} às ${event.time}`}
              >
                <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden">
                  <LazyImage 
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    aspectRatio="square"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-semibold text-sm text-foreground line-clamp-1">{event.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.location}</p>
                  <p className="text-xs text-primary font-medium mt-1">{event.time}</p>
                </div>
                <ChevronRight className="flex-shrink-0 w-4 h-4 text-muted-foreground/50 self-center group-hover:text-primary transition-colors" aria-hidden="true" />
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground/50" aria-hidden="true" />
            </div>
            <p className="text-base font-semibold mb-1">Nenhum evento ainda</p>
            <p className="text-sm text-muted-foreground">Seja o primeiro a criar um evento incrível!</p>
          </div>
        )}
      </section>
    </div>
  );
};
