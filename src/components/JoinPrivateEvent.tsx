import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lock, Users, Calendar, MapPin, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  time: string;
  price: number;
  max_participants: number | null;
  private_code: string;
  image_url: string | null;
  created_by: string;
}

interface JoinPrivateEventProps {
  privateCode: string;
  onBack: () => void;
}

export const JoinPrivateEvent = ({ privateCode, onBack }: JoinPrivateEventProps) => {
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    loadEventDetails();
  }, [privateCode]);

  const loadEventDetails = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('private_code', privateCode)
        .eq('is_private', true)
        .single();

      if (eventError || !eventData) {
        toast({
          title: "Evento não encontrado",
          description: "O link do evento pode estar expirado ou inválido.",
          variant: "destructive"
        });
        return;
      }

      setEvent(eventData);

      // Check if user is already a participant
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: participantData } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', eventData.id)
          .eq('user_id', user.id)
          .single();

        setHasJoined(!!participantData);
      }

      // Get participant count
      const { data: participants } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventData.id);

      setParticipantCount(participants?.length || 0);

    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do evento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    if (!event) return;

    setJoining(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa estar logado para participar de eventos.",
          variant: "destructive"
        });
        return;
      }

      // Check if event is full
      if (event.max_participants && participantCount >= event.max_participants) {
        toast({
          title: "Evento lotado",
          description: "Este evento já atingiu o número máximo de participantes.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: user.id
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Já participando",
            description: "Você já está participando deste evento.",
          });
          setHasJoined(true);
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Inscrição confirmada!",
          description: "Você foi inscrito no evento com sucesso.",
        });
        setHasJoined(true);
        setParticipantCount(prev => prev + 1);
      }

    } catch (error) {
      console.error('Erro ao participar do evento:', error);
      toast({
        title: "Erro na inscrição",
        description: "Não foi possível se inscrever no evento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Evento não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              O link do evento pode estar expirado ou inválido.
            </p>
            <Button onClick={onBack} variant="outline">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-primary-foreground hover:bg-primary-foreground/20">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            <h1 className="text-xl font-bold">Evento Privado</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        <Card>
          <CardContent className="p-0">
            {event.image_url && (
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-full h-48 object-cover rounded-t-lg"
              />
            )}
            <div className="p-4 space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
                <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                  {event.category}
                </span>
              </div>

              {event.description && (
                <p className="text-muted-foreground">{event.description}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{formatEventDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span>
                    {participantCount} participante{participantCount !== 1 ? 's' : ''}
                    {event.max_participants && ` de ${event.max_participants}`}
                  </span>
                </div>
              </div>

              {event.price > 0 && (
                <div className="text-lg font-semibold text-primary">
                  R$ {event.price.toFixed(2)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {hasJoined ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <div className="text-green-600 font-medium">
                  ✓ Você já está participando deste evento
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button 
              onClick={handleJoinEvent} 
              className="w-full h-12"
              disabled={joining || (event.max_participants && participantCount >= event.max_participants)}
            >
              {joining ? 'Inscrevendo...' : (
                event.max_participants && participantCount >= event.max_participants 
                  ? 'Evento Lotado' 
                  : 'Participar do Evento'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};