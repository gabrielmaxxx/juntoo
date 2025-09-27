import { Event, User } from '@/types';
import { EventCard } from './EventCard';
import { UserAvatar } from './UserAvatar';
import { getCurrentUser } from '@/data/mockData';
import { Sparkles, TrendingUp } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';

interface HomePageProps {
  events: Event[];
  users: User[];
  onEventClick: (event: Event) => void;
  currentUser?: {
    name: string;
  };
}

export const HomePage = ({ events, users, onEventClick, currentUser }: HomePageProps) => {
  const userName = currentUser?.name || 'Usuário';
  const trendingEvents = events.filter(event => event.isTrending);
  const featuredEvents = events.filter(event => event.isFeatured);
  const friendsEvents = events.filter(event => event.friendsGoing && event.friendsGoing.length > 0);
  const recommendedEvents = events.filter(event => !event.isTrending && !event.isFeatured);

  return (
    <div className="space-y-8 pb-20">
      {/* Welcome Section */}
      <div className="px-4 pt-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 font-poppins">
            Olá, {userName.split(' ')[0]}
          </h2>
          <p className="text-gray-600 leading-relaxed -mt-1">
            O que vamos fazer hoje?
          </p>
        </div>
      </div>

      {/* Mission Card */}
      <div className="px-4">
        <div className="relative rounded-2xl overflow-hidden juntoo-shadow">
          <img 
            src={heroImage}
            alt="Pessoas se conectando através de atividades"
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 juntoo-gradient opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Sparkles className="w-8 h-8 mx-auto mb-2" />
              <h3 className="font-bold text-lg">Conecte-se através de atividades</h3>
              <p className="text-sm opacity-90">Descubra pessoas com seus interesses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stories Section */}
      <div className="px-4">
        <h3 className="text-md font-semibold text-gray-800 mb-3">Perfis em Destaque</h3>
        <div className="flex space-x-4 overflow-x-auto hide-scrollbar">
          {users.slice(0, 6).map((user) => (
            <UserAvatar 
              key={user.id} 
              user={user} 
              showStory 
              size="md"
            />
          ))}
        </div>
      </div>

      {/* Featured Events Banner */}
      {featuredEvents.length > 0 && (
        <div>
          <div className="flex space-x-4 overflow-x-auto hide-scrollbar pl-4">
            {featuredEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                variant="featured"
                onEventClick={onEventClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trending Events */}
      {trendingEvents.length > 0 && (
        <div className="px-4">
          <div className="flex items-center mb-3">
            <TrendingUp className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">Eventos em Alta</h3>
          </div>
          <div className="space-y-3">
            {trendingEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                variant="compact"
                onEventClick={onEventClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Friends Going */}
      {friendsEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 my-3 px-4">Seus amigos vão</h3>
          <div className="flex space-x-4 overflow-x-auto hide-scrollbar px-4">
            {friendsEvents.map((event) => (
              <div key={event.id} className="flex-shrink-0 w-72">
                <EventCard 
                  event={event} 
                  variant="compact"
                  onEventClick={onEventClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Events */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Recomendado para si</h3>
          <div className="flex items-center">
            <Sparkles className="w-4 h-4 text-primary mr-1" />
            <p className="text-xs text-gray-500">Com base nos seus interesses</p>
          </div>
        </div>
        <div className="space-y-4">
          {recommendedEvents.slice(0, 3).map((event) => (
            <EventCard 
              key={event.id} 
              event={event}
              onEventClick={onEventClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};