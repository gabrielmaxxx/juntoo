import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SplashScreen } from '@/components/SplashScreen';
import { AppHeader } from '@/components/AppHeader';
import { Navigation } from '@/components/Navigation';
import { HomePage } from '@/components/HomePage';
import { EventDetails } from '@/components/EventDetails';
import { ProfilePage } from '@/components/ProfilePage';
import { ActivitiesPage } from '@/components/ActivitiesPage';
import { CreateEventPage } from '@/components/CreateEventPage';
import { SearchPage } from '@/components/SearchPage';
import { AuthPage } from '@/pages/AuthPage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { EVENTS, USERS } from '@/data/mockData';
import { Event } from '@/types';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSplash, setShowSplash] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const activeTab = searchParams.get('tab') || 'home';

  const setActiveTab = (tab: string) => {
    if (tab === 'home') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleEventClickById = async (eventId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!error && data) {
      // Convert database event to Event type
      const event: Event = {
        id: data.id,
        title: data.title,
        category: data.category,
        location: data.location,
        date: data.date,
        time: data.time,
        price: data.price?.toString() || '0',
        description: data.description || '',
        imageUrl: data.image_url || '',
        attendees: [],
        createdBy: data.created_by
      };
      setSelectedEvent(event);
    }
  };

  const handleBack = () => {
    setSelectedEvent(null);
  };

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show auth page if user is not authenticated
  if (!user) {
    return <AuthPage />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Fully responsive mobile layout
  return (
    <div className="min-h-screen bg-white">
      <div className="w-full h-screen overflow-hidden relative animate-fade-in">
        
        {selectedEvent ? (
          <EventDetails event={selectedEvent} onBack={handleBack} />
        ) : (
          <div className="grid grid-rows-[auto_1fr_auto] h-full">
            {/* Header */}
            <AppHeader onEventClick={handleEventClickById} />
            
            {/* Main Content */}
            <main className="overflow-y-auto">
              <div key={activeTab} className="animate-fade-in">
                {activeTab === 'home' && (
                  <HomePage 
                    onEventClick={handleEventClick}
                    currentUser={{ name: profile?.full_name || 'Usuário' }}
                  />
                )}
                {activeTab === 'search' && (
                  <SearchPage onEventClick={handleEventClick} />
                )}
                {activeTab === 'activities' && (
                  <ActivitiesPage 
                    currentUser={{
                      id: user.id,
                      name: profile?.full_name || 'Usuário',
                      email: user.email || '',
                      avatarUrl: profile?.avatar_url || '',
                      bio: '',
                      location: profile?.city || '',
                      rating: 4.8,
                      interests: profile?.interests || [],
                      badges: [],
                      posts: [],
                      registeredEvents: [],
                      attendedEvents: []
                    }}
                    onEventClick={handleEventClick}
                    onCreateClick={() => setActiveTab('create')}
                  />
                )}
                {activeTab === 'profile' && (
                  <ProfilePage 
                    user={{
                      id: user.id,
                      name: profile?.full_name || 'Usuário',
                      email: user.email || '',
                      avatarUrl: profile?.avatar_url || '',
                      bio: '',
                      location: profile?.city || '',
                      rating: 4.8,
                      interests: profile?.interests || [],
                      badges: [],
                      posts: [],
                      registeredEvents: [],
                      attendedEvents: []
                    }}
                    onUserUpdate={() => {}}
                  />
                )}
                {activeTab === 'create' && (
                  <CreateEventPage onBack={() => setActiveTab('home')} />
                )}
              </div>
            </main>
            
            {/* Navigation */}
            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
