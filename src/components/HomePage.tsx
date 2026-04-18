import { useEffect, useRef } from 'react';
import { Event } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Flame, ChevronRight, ShieldCheck, MapPinned, Calendar, Sparkles, Plus, Compass } from 'lucide-react';
import { ImAvailableButton } from '@/features/availability';
import { useMyCommunities } from '@/features/communities';
import { Separator } from './ui/separator';
import { SectionDivider } from './ui/section-divider';
import { SectionHeader } from './ui/section-header';
import { HomePageSkeleton } from './skeletons';
import { LazyImage } from './ui/lazy-image';
import { useFriendsEvents } from '@/hooks/useEvents';
import { useHomeData } from '@/hooks/useHomeData';
import { useFeaturedEvents } from '@/hooks/useFeaturedEvents';
import { useGeolocation, formatDistance } from '@/hooks/useGeolocation';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { QueryErrorState } from './QueryErrorState';

interface HomePageProps {
  onEventClick: (event: Event) => void;
  currentUser?: {
    name: string;
  };
  onTabChange?: (tab: string) => void;
}

export const HomePage = ({ onEventClick, currentUser, onTabChange }: HomePageProps) => {
  const { profile, user } = useAuth();
  const userName = currentUser?.name || 'Usuário';

  const { latitude, longitude, city: geoCity, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();
  const { data: homeData, isLoading: loadingHome, isError: homeError, refetch: refetchHome } = useHomeData(geoCity);
  const trendingEvents = homeData?.trending ?? [];
  const nearbyEvents = homeData?.nearby ?? [];
  const loadingNearby = loadingHome;
  const { data: myCommunities = [] } = useMyCommunities();
  const { data: featuredEvents = [], isLoading: loadingFeatured } = useFeaturedEvents(5);

  const { data: friendsEvents = [], isLoading: loadingFriends, isError: friendsError, refetch: refetchFriends } = useFriendsEvents(user?.id, 3);

  const hasAnyEvents =
    featuredEvents.length > 0 ||
    trendingEvents.length > 0 ||
    nearbyEvents.length > 0 ||
    friendsEvents.length > 0;

  // Show toast feedback when geolocation state changes
  const prevGeoState = useRef({ latitude, geoError, geoLoading });
  useEffect(() => {
    const prev = prevGeoState.current;
    if (prev.geoLoading && !geoLoading) {
      if (latitude && geoCity) {
        toast.success(`Localização ativada: ${geoCity}`);
      } else if (latitude && !geoCity) {
        toast.success('Localização ativada! Buscando eventos...');
      } else if (geoError) {
        toast.error(geoError);
      }
    }
    prevGeoState.current = { latitude, geoError, geoLoading };
  }, [latitude, geoCity, geoError, geoLoading]);

  const loading = loadingHome || loadingFriends;

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

      {/* Spontaneous Mode */}
      <section className="px-5" aria-label="Modo Espontâneo">
        <ImAvailableButton onViewAvailable={() => onTabChange?.('available')} />
      </section>

      {/* My Communities */}
      {myCommunities.length > 0 && (
        <section className="px-5" aria-label="Minhas Comunidades">
          <div className="flex items-center justify-between">
            <SectionHeader title="Comunidades" subtitle="Seus grupos" />
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onTabChange?.('communities')}>
              Ver todas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide mt-3 -mx-5 px-5 pb-1">
            {myCommunities.slice(0, 5).map(c => (
              <button
                key={c.id}
                onClick={() => onTabChange?.(`communities`)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-16"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {c.name.charAt(0)}
                </div>
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">{c.name}</span>
              </button>
            ))}
            <button
              onClick={() => onTabChange?.('communities')}
              className="flex flex-col items-center gap-1.5 shrink-0 w-16"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <ChevronRight className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-muted-foreground">Mais</span>
            </button>
          </div>
        </section>
      )}

      {/* Divider */}
      <div className="px-5"><Separator className="bg-border/60" /></div>

      {/* Featured (curated by Juntoo team) */}
      {featuredEvents.length > 0 && (
        <section aria-label="Atividades em destaque">
          <div className="px-5 mb-4">
            <SectionHeader
              title="Em destaque"
              subtitle="Selecionado pela equipe Juntoo"
              icon={<Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />}
            />
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 px-5 pb-2">
              {featuredEvents.map((event) => (
                <article
                  key={event.id}
                  className="flex-shrink-0 w-72 cursor-pointer group"
                  onClick={() => onEventClick(event)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                  aria-label={`${event.title} em ${event.location}`}
                >
                  <div className="relative rounded-2xl overflow-hidden h-44 ring-2 ring-primary/30" style={{ boxShadow: 'var(--shadow-elevated)' }}>
                    <LazyImage
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden="true" />
                    <div className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary-foreground" />
                      <span className="text-[10px] font-bold text-primary-foreground uppercase tracking-wide">Destaque</span>
                    </div>
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

      {homeError ? (
        <section className="px-5" aria-label="Erro ao carregar eventos em alta">
          <QueryErrorState message="Não foi possível carregar eventos em alta." onRetry={refetchHome} compact />
        </section>
      ) : trendingEvents.length > 0 ? (
        <section aria-label="Eventos em Alta">
          <div className="px-5 mb-4">
            <SectionHeader 
              title="Em Alta"
              subtitle="Eventos populares agora"
              icon={<Flame className="w-5 h-5 text-destructive" aria-hidden="true" />}
            />
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
      ) : null}

      {/* Spacer between sections */}
      {friendsEvents.length > 0 && trendingEvents.length > 0 && (
        <div className="px-5"><Separator className="bg-border/40" /></div>
      )}

      {/* Friends' Events - compact layout */}
      {friendsEvents.length > 0 && (
        <section className="px-5" aria-label="Eventos dos seus amigos">
          <div className="mb-4">
            <SectionHeader 
              title="Seus amigos vão"
              subtitle="Veja onde sua rede está indo"
            />
          </div>
          <div className="space-y-3">
            {friendsEvents.map((event) => (
              <article 
                key={event.id}
                onClick={() => onEventClick(event)}
                className="flex gap-4 cursor-pointer group bg-card rounded-2xl p-3 transition-all duration-200 hover:shadow-md"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                aria-label={`${event.title} em ${event.location}`}
                style={{ boxShadow: 'var(--shadow-card)' }}
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
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1 flex items-center gap-1">
                    <MapPinned className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    {event.location}
                  </p>
                  <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    {event.time}
                  </p>
                </div>
                <ChevronRight className="flex-shrink-0 w-4 h-4 text-muted-foreground/50 self-center group-hover:text-primary transition-colors" aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Divider before Nearby */}
      {(trendingEvents.length > 0 || friendsEvents.length > 0) && (
        <div className="px-5"><Separator className="bg-border/60" /></div>
      )}

      {/* Geolocation CTA or Nearby Events */}
      {!latitude && !geoError ? (
        <section className="px-5" aria-label="Ativar localização">
          <div className="bg-card rounded-2xl p-4 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPinned className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Eventos perto de você</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ative a localização para ver eventos na sua cidade</p>
            </div>
            <Button size="sm" variant="outline" onClick={requestLocation} disabled={geoLoading} className="flex-shrink-0">
              {geoLoading ? 'Buscando...' : 'Ativar'}
            </Button>
          </div>
        </section>
      ) : geoError ? (
        <section className="px-5" aria-label="Erro de localização">
          <div className="bg-card rounded-2xl p-4 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <MapPinned className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Localização indisponível</p>
              <p className="text-xs text-muted-foreground mt-0.5">{geoError}</p>
            </div>
            <Button size="sm" variant="outline" onClick={requestLocation} disabled={geoLoading} className="flex-shrink-0">
              Tentar novamente
            </Button>
          </div>
        </section>
      ) : (
        <section className="px-5" aria-label="Eventos perto de você">
          <div className="mb-4">
            <SectionHeader 
              title="Perto de você"
              subtitle={geoCity ? `Eventos em ${geoCity}` : "Eventos na sua região"}
              icon={<MapPinned className="w-5 h-5 text-primary" aria-hidden="true" />}
            />
          </div>
          {loadingNearby ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-card rounded-2xl p-3 animate-pulse h-24" />
              ))}
            </div>
          ) : nearbyEvents.length > 0 ? (
            <div className="space-y-3">
              {nearbyEvents.map((event) => (
                <article 
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="flex gap-4 cursor-pointer group bg-card rounded-2xl p-3 transition-all duration-200 hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                  aria-label={`${event.title} em ${event.location}`}
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
            <div className="bg-card rounded-2xl p-6 text-center animate-fade-in" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MapPinned className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {geoCity ? `Nada acontecendo em ${geoCity} agora` : 'Nenhum evento próximo'}
              </p>
              <p className="text-xs text-muted-foreground">
                Que tal criar o primeiro evento da região? 🌟
              </p>
            </div>
          )}
        </section>
      )}

      {/* Global empty state — shown only when there's truly nothing */}
      {!loading && !loadingFeatured && !hasAnyEvents && (
        <section className="px-5" aria-label="Nenhuma atividade ainda">
          <div className="bg-card rounded-3xl p-8 text-center animate-fade-in" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5 relative">
              <Sparkles className="w-9 h-9 text-primary" aria-hidden="true" />
              <span className="absolute -top-2 -right-2 text-2xl animate-bounce" aria-hidden="true">✨</span>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              Seja o primeiro a criar uma atividade aqui!
            </h2>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed mb-6">
              {geoCity ? `${geoCity} ainda está acordando no Juntoo.` : 'Sua cidade ainda está acordando no Juntoo.'} Que tal começar você?
            </p>
            <div className="flex flex-col gap-2 max-w-[260px] mx-auto">
              <Button onClick={() => onTabChange?.('create')} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Criar uma atividade
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onTabChange?.('search')} className="w-full gap-2">
                <Compass className="w-4 h-4" />
                Explorar outras cidades
              </Button>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};
