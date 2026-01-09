import { Event } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Flame, ChevronRight, ShieldCheck } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { LazyImage } from './ui/lazy-image';
import { useTrendingEvents, useFriendsEvents, useRecommendedEvents } from '@/hooks/useEvents';

interface HomePageProps {
  onEventClick: (event: Event) => void;
  currentUser?: {
    name: string;
  };
}

export const HomePage = ({ onEventClick, currentUser }: HomePageProps) => {
  const { profile, user } = useAuth();
  const userName = currentUser?.name || 'Usuário';

  // Use optimized hooks with React Query caching
  const { data: trendingEvents = [], isLoading: loadingTrending } = useTrendingEvents(5);
  const { data: friendsEvents = [], isLoading: loadingFriends } = useFriendsEvents(user?.id, 3);
  const { data: recommendedEvents = [], isLoading: loadingRecommended } = useRecommendedEvents(
    user?.id,
    profile?.interests || null,
    10
  );

  const loading = loadingTrending || loadingFriends || loadingRecommended;

  // Daily missions that change based on the day
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
    return (
      <div className="space-y-6 pb-24 px-4 pt-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Greeting Message - Centered */}
      <header className="px-4 pt-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {userName}
        </h1>
        <p className="text-muted-foreground mt-2">
          O que vamos fazer hoje?
        </p>
      </header>

      {/* Daily Mission */}
      <section className="px-4" aria-label="Missão do Dia">
        <div className="juntoo-gradient rounded-2xl p-6 shadow-md relative overflow-hidden animate-fade-in">
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[slide-in-right_3s_ease-in-out_infinite]" aria-hidden="true" />
          
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex-1">
              <h2 className="text-primary-foreground font-bold text-lg mb-2">
                Missão do Dia
              </h2>
              <p className="text-primary-foreground text-base leading-relaxed">
                {dailyMission.text}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center animate-pulse">
                <ShieldCheck className="w-8 h-8 text-primary-foreground" strokeWidth={2.5} aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Events - Horizontal Scroll */}
      {trendingEvents.length > 0 && (
        <section aria-label="Eventos em Alta">
          <div className="px-4 mb-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Eventos em Alta
              <Flame className="w-5 h-5 text-destructive" aria-hidden="true" />
            </h2>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-4 pb-2">
              {trendingEvents.map((event) => (
                <article 
                  key={event.id} 
                  className="flex-shrink-0 w-64 cursor-pointer group"
                  onClick={() => onEventClick(event)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                  aria-label={`${event.title} em ${event.location}`}
                >
                  <div className="relative rounded-xl overflow-hidden h-36">
                    <LazyImage 
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
                    <div className="absolute bottom-0 left-0 p-4 text-primary-foreground">
                      <h3 className="font-semibold text-base mb-1">{event.title}</h3>
                      <p className="text-xs opacity-90">{event.location}</p>
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
        <section className="px-4" aria-label="Eventos dos seus amigos">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Seus amigos vão
          </h2>
          <div className="space-y-3">
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
                <div className="relative rounded-xl overflow-hidden h-40">
                  <LazyImage 
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-primary-foreground">
                    <h3 className="font-semibold text-base">{event.title}</h3>
                  </div>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-primary-foreground" aria-hidden="true" />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Events */}
      <section className="px-4" aria-label="Eventos recomendados">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            Recomendado para si
            <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Com base nos seus interesses</p>
        </div>
        {recommendedEvents.length > 0 ? (
          <div className="space-y-3">
            {recommendedEvents.map((event) => (
              <article 
                key={event.id}
                onClick={() => onEventClick(event)}
                className="flex gap-3 cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                aria-label={`${event.title} em ${event.location} às ${event.time}`}
              >
                <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden">
                  <LazyImage 
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    aspectRatio="square"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">{event.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{event.location} • {event.time}</p>
                </div>
                <ChevronRight className="flex-shrink-0 w-5 h-5 text-muted-foreground self-center" aria-hidden="true" />
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted" aria-hidden="true" />
            <p className="text-lg font-medium mb-2">Nenhum evento ainda</p>
            <p className="text-sm">Seja o primeiro a criar um evento incrível!</p>
          </div>
        )}
      </section>
    </div>
  );
};
