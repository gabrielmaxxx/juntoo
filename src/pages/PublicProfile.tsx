/**
 * Public Profile Page (sem autenticação obrigatória)
 *
 * Rota: /u/:handle  (handle = username OU userId UUID)
 *
 * Exibe foto, nome, cidade, bio, reputação, interesses, badges e
 * eventos públicos criados. Inclui meta tags Open Graph apontando para
 * a Edge Function `og-image` que renderiza um cartão dinâmico 1200x630.
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { MapPin, Calendar, UserPlus, MessageCircle, Lock, Download, Sparkles } from 'lucide-react';
import { usePublicProfile } from '@/features/profile/hooks/usePublicProfile';
import { getReputationLevel, BADGE_DEFINITIONS } from '@/hooks/useReputationScore';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

const PublicProfile = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = usePublicProfile(handle);

  // OG image URL — public Edge Function
  const ogImageUrl = handle
    ? `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/og-image?${
        /^[0-9a-f-]{36}$/i.test(handle) ? `userId=${handle}` : `username=${handle}`
      }`
    : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <EmptyState
          icon={<span className="text-4xl">🔍</span>}
          title="Perfil não encontrado"
          description="Este usuário não existe ou alterou seu nome de usuário."
          actionLabel="Ir para a home"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  if (data.private) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold">{data.full_name}</h1>
            <p className="text-muted-foreground">
              Este perfil é privado. Faça login para conectar-se.
            </p>
            {!user && (
              <Button onClick={() => navigate('/auth')} className="w-full">
                Entrar no Juntoo
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const level = getReputationLevel(data.reputation.score);
  const pageTitle = `${data.full_name} no Juntoo${data.city ? ` — ${data.city}` : ''}`;
  const pageDescription = `Conheça ${data.full_name}, ${level.name} com ${data.reputation.events_attended} evento${data.reputation.events_attended === 1 ? '' : 's'} realizado${data.reputation.events_attended === 1 ? '' : 's'} na plataforma Juntoo.`;
  const canonicalUrl = `https://juntoo.lovable.app/u/${data.username || data.user_id}`;

  const isOwnProfile = user?.id === data.user_id;

  const handleFollow = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // Navigate to authenticated user profile page (request friendship there)
    navigate(`/user/${data.user_id}`);
  };

  const handleInvite = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/?tab=create');
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta property="profile:first_name" content={data.full_name.split(' ')[0]} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImageUrl} />

        {/* JSON-LD structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: data.full_name,
            image: data.avatar_url,
            address: data.city ? { '@type': 'PostalAddress', addressLocality: data.city } : undefined,
            url: canonicalUrl,
          })}
        </script>
      </Helmet>

      <main className="min-h-screen bg-background">
        {/* Hero gradient header */}
        <header
          className="relative pt-12 pb-20 px-6"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
          }}
        >
          <div className="max-w-2xl mx-auto text-center">
            <Link to="/" className="inline-block text-primary-foreground/90 font-bold text-2xl mb-6">
              Juntoo
            </Link>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 -mt-16 pb-20 space-y-6">
          {/* Profile card */}
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="w-28 h-28 mx-auto -mt-20 border-4 border-background ring-2 ring-primary/20">
                <AvatarImage src={data.avatar_url ?? undefined} alt={data.full_name} />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  {data.full_name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-2xl font-bold mt-4 flex items-center justify-center gap-2">
                {data.full_name}
                <VerifiedBadge verified={data.verified} businessVerified={data.business_verified} />
              </h1>

              {data.username && (
                <p className="text-sm text-muted-foreground">@{data.username}</p>
              )}

              {data.city && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {data.city}
                </p>
              )}

              {/* Reputation badge */}
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <Badge className={`${level.bg} ${level.color} border-0 text-sm`}>
                  ⭐ {level.name}
                </Badge>
                <Badge variant="outline">
                  {data.reputation.events_attended} evento
                  {data.reputation.events_attended === 1 ? '' : 's'}
                </Badge>
                {data.reputation.events_created > 0 && (
                  <Badge variant="outline">
                    {data.reputation.events_created} criado
                    {data.reputation.events_created === 1 ? '' : 's'}
                  </Badge>
                )}
              </div>

              {data.bio && (
                <p className="text-sm text-foreground mt-4 max-w-md mx-auto">{data.bio}</p>
              )}

              {/* Action buttons (only when not own profile) */}
              {!isOwnProfile && (
                <div className="flex gap-2 justify-center mt-6">
                  <Button onClick={handleFollow} size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Conectar
                  </Button>
                  <Button onClick={handleInvite} variant="outline" size="sm">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Convidar para evento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interests */}
          {data.interests && data.interests.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold mb-3">Interesses</h2>
                <div className="flex flex-wrap gap-2">
                  {data.interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Achievements */}
          {data.achievements.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Conquistas
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {data.achievements.map((ach) => {
                    const def = BADGE_DEFINITIONS.find((b) => b.id === ach.badge_id);
                    if (!def) return null;
                    return (
                      <div
                        key={ach.badge_id}
                        className="text-center"
                        title={def.description}
                      >
                        <div className="text-3xl">{def.icon}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                          {def.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Public events created */}
          {data.public_events.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Eventos criados
                </h2>
                <div className="space-y-2">
                  {data.public_events.map((event) => (
                    <Link
                      key={event.id}
                      to={`/?event=${event.id}`}
                      className="flex gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      {event.image_url && (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          loading="lazy"
                          className="w-16 h-16 rounded-md object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(event.date), "d 'de' MMM", { locale: ptBR })} · {event.time}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          📍 {event.location}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTA for non-logged-in visitors */}
          {!user && (
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-lg mb-2">Junte-se ao Juntoo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Conecte-se com {data.full_name.split(' ')[0]} e descubra eventos perto de você.
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button onClick={() => navigate('/auth')}>Criar conta grátis</Button>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    <Download className="w-4 h-4 mr-2" />
                    Conheça o app
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
};

export default PublicProfile;
