import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { SplashScreen } from '@/components/SplashScreen';
import { AppHeader } from '@/components/AppHeader';
import { Navigation } from '@/components/Navigation';
import { EventDetails } from '@/components/EventDetails';
import { JoinPrivateEvent } from '@/components/JoinPrivateEvent';
import { OnboardingFlow } from '@/components/onboarding';
const AuthPage = lazy(() => import('@/pages/AuthPage').then(m => ({ default: m.AuthPage })));
import { SkipLink } from '@/components/SkipLink';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { LiveRegion } from '@/components/ui/live-region';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';

// Code-split heavy page components for smaller initial bundle
const HomePage = lazy(() => import('@/components/HomePage').then(m => ({ default: m.HomePage })));
const SearchPage = lazy(() => import('@/components/SearchPage').then(m => ({ default: m.SearchPage })));
const ActivitiesPage = lazy(() => import('@/components/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })));
const ProfilePage = lazy(() => import('@/components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CreateEventPage = lazy(() => import('@/components/CreateEventPage').then(m => ({ default: m.CreateEventPage })));
const MessagesPage = lazy(() => import('@/components/MessagesPage').then(m => ({ default: m.MessagesPage })));
const SettingsPage = lazy(() => import('@/components/settings').then(m => ({ default: m.SettingsPage })));

const TabLoadingFallback = () => (
  <div className="p-4 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-40 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
  </div>
);

const Index = () => {
  const { user, profile, loading, isBanned, isSuspended, restrictions, signOut } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { privateCode } = useParams<{ privateCode: string }>();
  const [showSplash, setShowSplash] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check onboarding status when profile loads
  useEffect(() => {
    if (profile && !(profile as any).onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [profile]);

  const activeTab = searchParams.get('tab') || 'home';

  // Handle ?event=ID query param (from shared links)
  useEffect(() => {
    const eventId = searchParams.get('event');
    if (eventId && user) {
      handleEventClickById(eventId);
      // Remove the param after processing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('event');
      setSearchParams(newParams, { replace: true });
    }
  }, [user, searchParams]);

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
        participantsCount: 0,
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
      <div className="min-h-dvh bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center" role="status" aria-label="Carregando aplicação">
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
    return <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>}><AuthPage /></Suspense>;
  }

  // Show banned screen
  if (isBanned) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Conta Banida</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta foi permanentemente bloqueada por violação dos termos de uso da plataforma.
          </p>
          {restrictions.find(r => r.restriction_type === 'restricted')?.reason && (
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              Motivo: {restrictions.find(r => r.restriction_type === 'restricted')?.reason}
            </p>
          )}
          <button onClick={signOut} className="text-sm text-primary underline">Sair da conta</button>
        </div>
      </div>
    );
  }

  // Show suspended screen
  if (isSuspended) {
    const suspension = restrictions.find(r => r.restriction_type === 'restricted');
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto">
            <span className="text-3xl">⏸️</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Conta Suspensa</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta está temporariamente suspensa.
          </p>
          {suspension?.reason && (
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              Motivo: {suspension.reason}
            </p>
          )}
          {suspension?.expires_at && (
            <p className="text-xs text-muted-foreground">
              Suspensão expira em: {new Date(suspension.expires_at).toLocaleDateString('pt-BR')}
            </p>
          )}
          <button onClick={signOut} className="text-sm text-primary underline">Sair da conta</button>
        </div>
      </div>
    );
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={() => setShowOnboarding(false)}
        onEventClick={(event) => {
          setShowOnboarding(false);
          setSelectedEvent(event);
        }}
      />
    );
  }

  // Handle private event join route
  if (privateCode) {
    return <JoinPrivateEvent privateCode={privateCode} onBack={() => window.location.href = '/'} />;
  }

  const tabLabels: Record<string, string> = {
    home: 'Página inicial',
    search: 'Busca de eventos',
    activities: 'Minhas atividades',
    profile: 'Perfil',
    create: 'Criar evento',
    messages: 'Mensagens',
    settings: 'Configurações',
  };

  // Fully responsive mobile layout
  return (
    <div className="min-h-dvh bg-background overflow-x-hidden">
      <OfflineBanner />
      {/* Splash overlay — renders on top while main layout loads underneath */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="w-full h-dvh overflow-x-hidden overflow-y-hidden relative animate-fade-in">
        {/* Skip Link for Accessibility */}
        <SkipLink />
        
        {/* Live region for tab changes */}
        <LiveRegion message={`Navegando para ${tabLabels[activeTab] || activeTab}`} />

        {selectedEvent ? (
          <EventDetails event={selectedEvent} onBack={handleBack} />
        ) : (
          <div className="grid grid-rows-[auto_1fr_auto] h-full">
            {/* Header */}
            <AppHeader onEventClick={handleEventClickById} onMessagesClick={() => setActiveTab('messages')} onSettingsClick={() => setActiveTab('settings')} />
            
            {/* Main Content */}
            <main id="main-content" className="overflow-y-auto" tabIndex={-1}>
              <div key={activeTab} className="animate-fade-in">
                <ErrorBoundary>
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
                    {activeTab === 'messages' && (
                      <MessagesPage 
                        onBack={() => setActiveTab('home')}
                        initialConversationId={searchParams.get('conv') || undefined}
                        initialUserId={searchParams.get('userId') || undefined}
                        onOpenEventChat={(eventId) => handleEventClickById(eventId)}
                      />
                    )}
                    {activeTab === 'settings' && (
                      <SettingsPage onBack={() => setActiveTab('home')} />
                    )}
                  </Suspense>
                </ErrorBoundary>
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
