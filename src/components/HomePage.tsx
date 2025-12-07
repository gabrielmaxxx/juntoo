import { Event } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Flame, ChevronRight, ShieldCheck } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
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
      <div className="px-4 pt-6 text-center">
        <h2 className="text-2xl font-bold text-foreground">
          Olá, {userName}
        </h2>
        <p className="text-muted-foreground mt-2">
          O que vamos fazer hoje?
        </p>
      </div>

      {/* Daily Mission */}
      <div className="px-4">
        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl p-6 shadow-md relative overflow-hidden animate-fade-in">
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[slide-in-right_3s_ease-in-out_infinite]" />
          
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg mb-2">
                Missão do Dia
              </h3>
              <p className="text-white text-base leading-relaxed">
                {dailyMission.text}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center animate-pulse">
                <ShieldCheck className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Events - Horizontal Scroll */}
      {trendingEvents.length > 0 && (
        <div>
          <div className="px-4 mb-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              Eventos em Alta
              <Flame className="w-5 h-5 text-orange-500" />
            </h3>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-4 pb-2">
              {trendingEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex-shrink-0 w-64 cursor-pointer"
                  onClick={() => onEventClick(event)}
                >
                  <div className="relative rounded-xl overflow-hidden h-36">
                    <img 
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-4 text-white">
                      <h4 className="font-semibold text-base mb-1">{event.title}</h4>
                      <p className="text-xs opacity-90">{event.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Friends' Events */}
      {friendsEvents.length > 0 && (
        <div className="px-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Seus amigos vão
          </h3>
          <div className="space-y-3">
            {friendsEvents.map((event) => (
              <div 
                key={event.id}
                onClick={() => onEventClick(event)}
                className="cursor-pointer"
              >
                <div className="relative rounded-xl overflow-hidden h-40">
                  <img 
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h4 className="font-semibold text-base">{event.title}</h4>
                  </div>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Events */}
      <div className="px-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            Recomendado para si
            <Sparkles className="w-5 h-5 text-primary" />
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Com base nos seus interesses</p>
        </div>
        {recommendedEvents.length > 0 ? (
          <div className="space-y-3">
            {recommendedEvents.map((event) => (
              <div 
                key={event.id}
                onClick={() => onEventClick(event)}
                className="flex gap-3 cursor-pointer"
              >
                <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden">
                  <img 
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base text-gray-800 truncate">{event.title}</h4>
                  <p className="text-sm text-gray-600 truncate">{event.location} • {event.time}</p>
                </div>
                <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400 self-center" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Nenhum evento ainda</p>
            <p className="text-sm">Seja o primeiro a criar um evento incrível!</p>
          </div>
        )}
      </div>
    </div>
  );
};
