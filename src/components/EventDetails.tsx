import { useState, useEffect } from 'react';
import { Event } from '@/types';
import { Calendar, MapPin, Tag, Users, Share2, ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from './UserAvatar';

interface EventDetailsProps {
  event: Event;
  onBack: () => void;
}

export const EventDetails = ({ event, onBack }: EventDetailsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isParticipating, setIsParticipating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      checkParticipation();
      fetchParticipants();
    }
  }, [user, event.id]);

  const checkParticipation = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single();

      setIsParticipating(!!data);
    } catch (error) {
      // Error expected if not participating
      setIsParticipating(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      // Buscar participantes
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', event.id);

      if (participantsError) throw participantsError;

      if (!participantsData || participantsData.length === 0) {
        setParticipants([]);
        return;
      }

      // Buscar perfis dos participantes
      const userIds = participantsData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combinar dados
      const participantsWithProfiles = participantsData.map(participant => ({
        user_id: participant.user_id,
        profiles: profilesData?.find(p => p.user_id === participant.user_id)
      }));

      setParticipants(participantsWithProfiles);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handleParticipate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (isParticipating) {
        // Leave event
        const { error } = await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsParticipating(false);
        toast({
          title: "Você saiu do evento",
          description: "Sua participação foi cancelada.",
        });
      } else {
        // Verificar se já participa
        const { data: existing } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          setIsParticipating(true);
          toast({
            title: "Você já participa",
            description: "Você já está inscrito neste evento.",
          });
          return;
        }

        // Join event
        const { error } = await supabase
          .from('event_participants')
          .insert({
            event_id: event.id,
            user_id: user.id
          });

        if (error) throw error;

        setIsParticipating(true);
        toast({
          title: "Parabéns!",
          description: "Você confirmou sua participação no evento.",
        });
      }
      
      fetchParticipants();
    } catch (error) {
      console.error('Error with participation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua solicitação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const formatDateTime = (date: string, time: string) => {
    const eventDate = new Date(`${date}T${time}`);
    return eventDate.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  return (
    <div className="h-full flex flex-col bg-white">
      {/* Hero Image */}
      <div className="relative w-full h-64 flex-shrink-0">
        <img 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute top-4 left-4 bg-black/20 text-white hover:bg-black/40"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        {/* Share Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-black/20 text-white hover:bg-black/40"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto bg-white rounded-t-2xl -mt-4 z-10 relative">
        {/* Event Title and Category */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900 flex-1 pr-4 font-poppins">
              {event.title}
            </h1>
            <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-medium flex-shrink-0">
              {event.category}
            </span>
          </div>
          {event.subtitle && (
            <p className="text-gray-600 font-medium">{event.subtitle}</p>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-3">
          <div className="flex items-center text-gray-700">
            <Calendar className="w-5 h-5 mr-3 text-primary" />
            <span>{formatDateTime(event.date, event.time)}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <MapPin className="w-5 h-5 mr-3 text-primary" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <Tag className="w-5 h-5 mr-3 text-primary" />
            <span className="font-medium">{event.price}</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Sobre o evento</h3>
          <p className="text-gray-700 leading-relaxed">{event.description}</p>
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">
              Participantes ({participants.length})
            </h3>
            <div className="flex items-center -space-x-2">
              {participants.slice(0, 5).map((participant, index) => (
                <div key={participant.user_id} className="relative" style={{ zIndex: 5 - index }}>
                  <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                    {participant.profiles?.avatar_url ? (
                      <img 
                        src={participant.profiles.avatar_url} 
                        alt={participant.profiles.full_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {participant.profiles?.full_name?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {participants.length > 5 && (
                <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-sm font-medium text-gray-600">
                  +{participants.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Section */}
        {isParticipating && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Chat do Evento</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  O chat ficará disponível quando mais participantes se juntarem
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="p-4 bg-white border-t border-gray-200">
        <Button 
          variant={isParticipating ? "outline" : "hero"} 
          className="w-full" 
          onClick={handleParticipate}
          disabled={loading}
        >
          {loading ? 'Carregando...' : isParticipating ? 'Sair do Evento' : 'Participar'}
        </Button>
      </div>
    </div>
  );
};