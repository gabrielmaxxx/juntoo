import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { MapPin, UserPlus, Heart, ArrowLeft } from 'lucide-react';
import { AppHeader } from './AppHeader';
import { BottomNavigation } from './BottomNavigation';

interface SuggestedUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  interests: string[] | null;
  commonInterests: string[];
  sameCity: boolean;
  score: number;
}

export const FriendSuggestionsPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.user_id) {
      fetchSuggestions();
    }
  }, [profile]);

  const fetchSuggestions = async () => {
    if (!profile?.user_id) return;

    try {
      setLoading(true);

      // Get current friendships to exclude
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${profile.user_id},friend_id.eq.${profile.user_id}`);

      const excludedUserIds = new Set<string>([profile.user_id]);
      friendships?.forEach(f => {
        excludedUserIds.add(f.user_id);
        excludedUserIds.add(f.friend_id);
      });

      // Fetch all profiles except excluded ones
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, city, interests')
        .not('user_id', 'in', `(${Array.from(excludedUserIds).join(',')})`);

      if (error) throw error;

      if (!profiles) {
        setSuggestions([]);
        return;
      }

      // Calculate compatibility scores
      const userInterests = new Set(profile.interests || []);
      const userCity = profile.city;

      const scoredUsers: SuggestedUser[] = profiles
        .map(p => {
          const profileInterests = new Set(p.interests || []);
          const commonInterests = Array.from(userInterests).filter(i => profileInterests.has(i));
          const sameCity = userCity && p.city && userCity === p.city;
          
          // Score: 10 points per common interest + 20 points for same city
          const score = (commonInterests.length * 10) + (sameCity ? 20 : 0);

          return {
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            city: p.city,
            interests: p.interests,
            commonInterests,
            sameCity: sameCity || false,
            score,
          };
        })
        .filter(u => u.score > 0) // Only show users with at least something in common
        .sort((a, b) => b.score - a.score) // Sort by compatibility
        .slice(0, 20); // Limit to top 20

      setSuggestions(scoredUsers);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as sugestões de amizade.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (friendId: string) => {
    if (!user) return;

    setSendingRequest(friendId);
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: "Seu pedido de amizade foi enviado com sucesso.",
      });

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.user_id !== friendId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação de amizade.",
        variant: "destructive"
      });
    } finally {
      setSendingRequest(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-6 pb-24">
          <h1 className="text-2xl font-bold mb-6">Sugestões de Amizade</h1>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Sugestões de Amizade</h1>
          <p className="text-muted-foreground mt-1">
            Pessoas com interesses e localização em comum com você
          </p>
        </div>

        {suggestions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground mb-2">
                Nenhuma sugestão disponível no momento
              </p>
              <p className="text-sm text-muted-foreground">
                Adicione mais interesses ao seu perfil para receber melhores sugestões!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {suggestions.map(suggestion => (
              <Card 
                key={suggestion.user_id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="cursor-pointer"
                      onClick={() => navigate(`/user/${suggestion.user_id}`)}
                    >
                      {suggestion.avatar_url ? (
                        <img
                          src={suggestion.avatar_url}
                          alt={suggestion.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xl font-medium text-primary">
                            {suggestion.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3
                        className="font-semibold text-lg text-foreground cursor-pointer hover:underline"
                        onClick={() => navigate(`/user/${suggestion.user_id}`)}
                      >
                        {suggestion.full_name}
                      </h3>

                      {suggestion.city && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {suggestion.city}
                          {suggestion.sameCity && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Mesma cidade
                            </Badge>
                          )}
                        </p>
                      )}

                      {suggestion.commonInterests.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">
                            Interesses em comum:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {suggestion.commonInterests.map((interest, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-2">
                        <span className="text-xs font-medium text-primary">
                          {Math.round((suggestion.score / 70) * 100)}% de compatibilidade
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSendFriendRequest(suggestion.user_id)}
                      disabled={sendingRequest === suggestion.user_id}
                      size="sm"
                    >
                      {sendingRequest === suggestion.user_id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
};
