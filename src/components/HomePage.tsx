import { useState, useEffect } from 'react';
import { Event, User } from '@/types';
import { EventCard } from './EventCard';
import { UserAvatar } from './UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, TrendingUp } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';

interface HomePageProps {
  onEventClick: (event: Event) => void;
  currentUser?: {
    name: string;
  };
}

export const HomePage = ({ onEventClick, currentUser }: HomePageProps) => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const userName = currentUser?.name || 'Usuário';

  const fetchEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_private', false)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      // Convert database events to our Event type
      const formattedEvents: Event[] = data?.map(event => ({
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
        isFeatured: false
      })) || [];

      // Keep only upcoming events (date/time >= now)
      const now = new Date();
      const upcomingEvents = formattedEvents.filter((e) => {
        const eventDateTime = new Date(`${e.date}T${e.time}`);
        return eventDateTime.getTime() >= now.getTime();
      });

      // Filter recommended events based on user interests
      const recommendedEvents = upcomingEvents.filter(event => {
        if (!profile?.interests) return true;
        return profile.interests.some(interest => 
          event.category.toLowerCase().includes(interest.toLowerCase()) ||
          event.title.toLowerCase().includes(interest.toLowerCase())
        );
      });

      setEvents(recommendedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Welcome Section */}
      <div className="px-4 pt-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 font-poppins">
            Olá, {userName.split(' ')[0]}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            O que vamos fazer hoje?
          </p>
        </div>
      </div>

      {/* Mission Card */}
      <div className="px-4">
        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden juntoo-shadow">
          <img 
            src={heroImage}
            alt="Pessoas se conectando através de atividades"
            className="w-full h-28 sm:h-32 object-cover"
          />
          <div className="absolute inset-0 juntoo-gradient opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="text-center text-white">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2" />
              <h3 className="font-bold text-base sm:text-lg">Conecte-se através de atividades</h3>
              <p className="text-xs sm:text-sm opacity-90">Descubra pessoas com seus interesses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Events */}
      <div className="px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">Eventos para você</h3>
          <div className="flex items-center">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary mr-1" />
            <p className="text-xs text-gray-500">Com base nos seus interesses</p>
          </div>
        </div>
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <EventCard 
                key={event.id} 
                event={event}
                onEventClick={onEventClick}
              />
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