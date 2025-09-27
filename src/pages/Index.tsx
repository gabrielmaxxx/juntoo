import { useState } from 'react';
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
import { EVENTS, USERS } from '@/data/mockData';
import { Event } from '@/types';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
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
  if (!user || !profile) {
    return <AuthPage />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Mobile frame layout
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm h-[800px] bg-white rounded-3xl juntoo-shadow-elevated overflow-hidden relative animate-fade-in">
        
        {selectedEvent ? (
          <EventDetails event={selectedEvent} onBack={handleBack} />
        ) : (
          <div className="grid grid-rows-[auto_1fr_auto] h-full">
            {/* Header */}
            <AppHeader />
            
            {/* Main Content */}
            <main className="overflow-y-auto">
              {activeTab === 'home' && (
                <HomePage 
                  events={EVENTS} 
                  users={USERS} 
                  onEventClick={handleEventClick}
                  currentUser={{ name: profile.full_name }}
                />
              )}
              {activeTab === 'search' && (
                <SearchPage onEventClick={handleEventClick} />
              )}
              {activeTab === 'activities' && (
                <ActivitiesPage 
                  events={EVENTS} 
                  currentUser={{
                    id: user.id,
                    name: profile.full_name,
                    email: user.email || '',
                    avatarUrl: profile.avatar_url || '/src/assets/avatar-anne.jpg',
                    bio: '',
                    location: profile.city || '',
                    rating: 4.8,
                    interests: profile.interests || [],
                    badges: [],
                    posts: [],
                    registeredEvents: [],
                    attendedEvents: []
                  }}
                  onEventClick={handleEventClick}
                />
              )}
              {activeTab === 'profile' && (
                <ProfilePage 
                  user={{
                    id: user.id,
                    name: profile.full_name,
                    email: user.email || '',
                    avatarUrl: profile.avatar_url || '/src/assets/avatar-anne.jpg',
                    bio: '',
                    location: profile.city || '',
                    rating: 4.8,
                    interests: profile.interests || [],
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
