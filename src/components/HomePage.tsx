import { useState, useEffect } from 'react';
import { Event } from '@/types';
import { EventCard } from './EventCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Flame, ChevronRight } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface HomePageProps {
  onEventClick: (event: Event) => void;
  currentUser?: {
    name: string;
  };
}

export const HomePage = ({ onEventClick, currentUser }: HomePageProps) => {
  const { profile, user } = useAuth();
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [friendsEvents, setFriendsEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const userName = currentUser?.name || 'Usuário';

  const fetchEvents = async () => {
    try {
      // Fetch all public events
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter out completed events
      const now = new Date();
      const activeEvents = data?.filter(event => {
        if (event.is_recurring) return true;
        const eventDateTime = new Date(`${event.date}T${event.time}`);
        const twentyFourHoursAfter = new Date(eventDateTime.getTime() + 24 * 60 * 60 * 1000);
        return now < twentyFourHoursAfter;
      }) || [];

      // Convert to Event type
      const formattedEvents: Event[] = activeEvents.map(event => ({
        id: event.id,
        title: event.title,
        category: event.category,
        location: event.location,
        date: event.date,
        time: event.time,
        price: event.price ? `R$ ${event.price}` : 'Gratuito',
        description: event.description || '',
        imageUrl: event.image_url || '/placeholder.svg',
        createdBy: event.created_by,
        attendees: [],
        isTrending: false,
        isFeatured: false,
        isRecurring: event.is_recurring
      }));

      // 1. Trending Events - Most recent events (top 5)
      setTrendingEvents(formattedEvents.slice(0, 5));

      // 2. Friends' Events - Events where friends are participants
      if (user?.id) {
        // Get user's friends
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');

        const friendIds = friendships?.map(f => 
          f.user_id === user.id ? f.friend_id : f.user_id
        ) || [];

        if (friendIds.length > 0) {
          // Get events where friends are participants
          const { data: friendParticipations } = await supabase
            .from('event_participants')
            .select('event_id')
            .in('user_id', friendIds);

          const friendEventIds = friendParticipations?.map(p => p.event_id) || [];
          const friendsGoingEvents = formattedEvents.filter(e => friendEventIds.includes(e.id));
          setFriendsEvents(friendsGoingEvents.slice(0, 3));
        }
      }

      // 3. Recommended Events - Based on user interests
      const recommended = formattedEvents.filter(event => {
        if (!profile?.interests || profile.interests.length === 0) return true;
        return profile.interests.some(interest => 
          event.category.toLowerCase().includes(interest.toLowerCase()) ||
          event.title.toLowerCase().includes(interest.toLowerCase())
        );
      });
      setRecommendedEvents(recommended.slice(0, 10));

    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [profile, user]);

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
      {/* Greeting Message */}
      <div className="px-4 pt-4">
        <h2 className="text-2xl font-bold text-foreground">
          Olá, {userName}! 👋
        </h2>
        <p className="text-muted-foreground mt-1">
          Descubra eventos incríveis perto de você
        </p>
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