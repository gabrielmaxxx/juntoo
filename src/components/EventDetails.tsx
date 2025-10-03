import { useState, useEffect, useRef } from 'react';
import { Event } from '@/types';
import { Calendar, MapPin, Tag, Users, Share2, ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from './UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      checkParticipation();
      fetchParticipants();
    }
  }, [user, event.id]);

  useEffect(() => {
    if (isParticipating) {
      fetchMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`event-${event.id}-messages`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'event_messages',
            filter: `event_id=eq.${event.id}`
          },
          (payload) => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isParticipating, event.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      // Get participant user IDs
      const { data: participantData, error: participantError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', event.id);

      if (participantError) throw participantError;

      if (!participantData || participantData.length === 0) {
        setParticipants([]);
        return;
      }

      // Get profiles for participants
      const userIds = participantData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const participantsWithProfiles = participantData.map(participant => ({
        user_id: participant.user_id,
        profiles: profilesData?.find(p => p.user_id === participant.user_id)
      }));

      setParticipants(participantsWithProfiles);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('event_messages')
        .select(`
          *,
          profiles!event_messages_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('event_messages')
        .insert({
          event_id: event.id,
          user_id: user.id,
          message: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem',
        variant: 'destructive'
      });
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
      <div className="flex-1 overflow-hidden bg-white rounded-t-2xl -mt-4 z-10 relative">
        <Tabs defaultValue="details" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            {isParticipating && <TabsTrigger value="chat">Chat</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="flex-1 p-4 space-y-6 overflow-y-auto mt-0">
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
          </TabsContent>

          {isParticipating && (
            <TabsContent value="chat" className="flex-1 flex flex-col mt-0 h-full">
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Seja o primeiro a enviar uma mensagem!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex gap-2 ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}
                      >
                        {msg.profiles?.avatar_url ? (
                          <img 
                            src={msg.profiles.avatar_url} 
                            alt={msg.profiles.full_name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-primary">
                              {msg.profiles?.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                        <div className={`flex-1 ${msg.user_id === user?.id ? 'text-right' : ''}`}>
                          <div className={`flex items-baseline gap-2 ${msg.user_id === user?.id ? 'justify-end' : ''}`}>
                            <p className="text-xs font-medium text-foreground">
                              {msg.profiles?.full_name || 'Usuário'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          <div className={`inline-block mt-1 px-3 py-2 rounded-2xl ${
                            msg.user_id === user?.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t border-border bg-white">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim()}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
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