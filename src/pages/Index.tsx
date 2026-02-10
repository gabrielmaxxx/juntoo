import { useState, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SplashScreen } from '@/components/SplashScreen';
import { AppHeader } from '@/components/AppHeader';
import { Navigation } from '@/components/Navigation';
import { EventDetails } from '@/components/EventDetails';
import { AuthPage } from '@/pages/AuthPage';
import { SkipLink } from '@/components/SkipLink';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { LiveRegion } from '@/components/ui/live-region';
import { Skeleton } from '@/components/ui/skeleton';

// Code-split heavy page components for smaller initial bundle
const HomePage = lazy(() => import('@/components/HomePage').then(m => ({ default: m.HomePage })));
const SearchPage = lazy(() => import('@/components/SearchPage').then(m => ({ default: m.SearchPage })));
const ActivitiesPage = lazy(() => import('@/components/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })));
const ProfilePage = lazy(() => import('@/components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CreateEventPage = lazy(() => import('@/components/CreateEventPage').then(m => ({ default: m.CreateEventPage })));

const TabLoadingFallback = () => (
  <div className="p-4 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-40 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
  </div>
);

const Index = () => {
  const { user, profile, loading } = useAuthContext();
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
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center" role="status" aria-label="Carregando aplicação">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
          <LiveRegion message="Carregando aplicação, por favor aguarde." politeness="assertive" />
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

  const tabLabels: Record<string, string> = {
    home: 'Página inicial',
    search: 'Busca de eventos',
    activities: 'Minhas atividades',
    profile: 'Perfil',
    create: 'Criar evento',
  };

  // Fully responsive mobile layout
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full h-screen overflow-hidden relative animate-fade-in">
        {/* Skip Link for Accessibility */}
        <SkipLink />
        
        {/* Live region for tab changes */}
        <LiveRegion message={`Navegando para ${tabLabels[activeTab] || activeTab}`} />

        {selectedEvent ? (
          <EventDetails event={selectedEvent} onBack={handleBack} />
        ) : (
          <div className="grid grid-rows-[auto_1fr_auto] h-full">
            {/* Header */}
            <AppHeader onEventClick={handleEventClickById} />
            
            {/* Main Content */}
            <main id="main-content" className="overflow-y-auto" tabIndex={-1}>
              <div key={activeTab} className="animate-fade-in">
                <Suspense fallback={<TabLoadingFallback />}>
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
                      onEventClick={handleEventClick}
                      onCreateClick={() => setActiveTab('create')}
                    />
                  )}
                  {activeTab === 'profile' && (
                    <ProfilePage />
                  )}
                  {activeTab === 'create' && (
                    <CreateEventPage onBack={() => setActiveTab('home')} />
                  )}
                </Suspense>
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
