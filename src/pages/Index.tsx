import { useState } from 'react';
import { SplashScreen } from '@/components/SplashScreen';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { HomePage } from '@/components/HomePage';
import { EventDetails } from '@/components/EventDetails';
import { ProfilePage } from '@/components/ProfilePage';
import { ActivitiesPage } from '@/components/ActivitiesPage';
import { EVENTS, USERS, getCurrentUser } from '@/data/mockData';
import { Event, User } from '@/types';

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(getCurrentUser());

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleBack = () => {
    setSelectedEvent(null);
  };

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
            <Header />
            
            {/* Main Content */}
            <main className="overflow-y-auto">
              {activeTab === 'home' && (
                <HomePage 
                  events={EVENTS} 
                  users={USERS} 
                  onEventClick={handleEventClick}
                />
              )}
              {activeTab === 'search' && (
                <div className="p-4 text-center text-gray-500">
                  <h2 className="text-xl font-semibold mb-2">Busca</h2>
                  <p>Funcionalidade em desenvolvimento</p>
                </div>
              )}
              {activeTab === 'activities' && (
                <ActivitiesPage 
                  events={EVENTS} 
                  currentUser={currentUser}
                  onEventClick={handleEventClick}
                />
              )}
              {activeTab === 'profile' && (
                <ProfilePage 
                  user={currentUser} 
                  onUserUpdate={setCurrentUser}
                />
              )}
              {activeTab === 'create' && (
                <div className="p-4 text-center text-gray-500">
                  <h2 className="text-xl font-semibold mb-2">Criar Evento</h2>
                  <p>Funcionalidade em desenvolvimento</p>
                </div>
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
