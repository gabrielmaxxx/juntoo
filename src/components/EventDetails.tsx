import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event } from '@/types';
import { Calendar, MapPin, Tag, Users, Share2, ArrowLeft, Send, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from './UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventReview } from './EventReview';
import { EventReviewForm } from './EventReviewForm';

interface EventDetailsProps {
  event: Event;
  onBack: () => void;
}

export const EventDetails = ({ event, onBack }: EventDetailsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isParticipating, setIsParticipating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [creator, setCreator] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [isEventCompleted, setIsEventCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      checkParticipation();
      fetchParticipants();
    }
    fetchCreator();
    fetchReviews();
    checkIfEventCompleted();
  }, [user, event.id]);

  const checkIfEventCompleted = () => {
    if (event.isRecurring) {
      setIsEventCompleted(false);
      return;
    }
    
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const twentyFourHoursAfter = new Date(eventDateTime.getTime() + 24 * 60 * 60 * 1000);
    
    setIsEventCompleted(now > twentyFourHoursAfter);
  };

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

  const fetchCreator = async () => {
    if (!event.createdBy) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('user_id', event.createdBy)
        .single();

      if (error) throw error;
      setCreator(data);
    } catch (error) {
      console.error('Error fetching creator:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('event_reviews')
        .select(`
          *,
          profiles!event_reviews_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);

      // Calculate average rating
      if (data && data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setAverageRating(null);
      }

      // Check if user has already reviewed
      if (user) {
        const userReview = data?.find(review => review.user_id === user.id);
        setUserHasReviewed(!!userReview);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('event_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: 'Avaliação removida',
        description: 'Sua avaliação foi removida com sucesso.'
      });

      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a avaliação.',
        variant: 'destructive'
      });
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update - add message immediately to UI
    const optimisticMessage = {
      id: tempId,
      event_id: event.id,
      user_id: user.id,
      message: messageText,
      created_at: new Date().toISOString(),
      profiles: {
        full_name: user.user_metadata?.full_name || 'Você',
        avatar_url: user.user_metadata?.avatar_url
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('event_messages')
        .insert({
          event_id: event.id,
          user_id: user.id,
          message: messageText
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageText);
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
      <div className="relative w-full h-48 sm:h-56 md:h-64 flex-shrink-0">
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
          className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/20 text-white hover:bg-black/40 h-9 w-9 sm:h-10 sm:w-10"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>

        {/* Share Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/20 text-white hover:bg-black/40 h-9 w-9 sm:h-10 sm:w-10"
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-white rounded-t-2xl -mt-4 z-10 relative">
        <Tabs defaultValue="details" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-3 sm:px-4">
            <TabsTrigger value="details" className="text-sm sm:text-base">Detalhes</TabsTrigger>
            {isParticipating && <TabsTrigger value="chat" className="text-sm sm:text-base">Chat</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="flex-1 p-3 sm:p-4 space-y-4 sm:space-y-6 overflow-y-auto mt-0 pb-20">
            {/* Event Title and Category */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 font-poppins">
                  {event.title}
                </h1>
                <span className="bg-primary/10 text-primary text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full font-medium flex-shrink-0">
                  {event.category}
                </span>
              </div>
              {event.subtitle && (
                <p className="text-gray-600 font-medium">{event.subtitle}</p>
              )}
            </div>

            {/* Event Details */}
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center text-gray-700 text-sm sm:text-base">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                <span className="break-words">{formatDateTime(event.date, event.time)}</span>
              </div>
              <div className="flex items-center text-gray-700 text-sm sm:text-base">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                <span className="break-words">{event.location}</span>
              </div>
              <div className="flex items-center text-gray-700 text-sm sm:text-base">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-primary flex-shrink-0" />
                <span className="font-medium">{event.price}</span>
              </div>
            </div>

            {/* Creator */}
            {creator && (
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Organizador</h3>
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    if (creator.user_id !== user?.id) {
                      navigate(`/user/${creator.user_id}`);
                    }
                  }}
                >
                  {creator.avatar_url ? (
                    <img 
                      src={creator.avatar_url} 
                      alt={creator.full_name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {creator.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{creator.full_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Criador do evento</p>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Sobre o evento</h3>
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{event.description}</p>
            </div>

            {/* Participants */}
            {participants.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  Participantes ({participants.length})
                </h3>
                <div className="flex items-center -space-x-2">
                  {participants.slice(0, 5).map((participant, index) => (
                    <div 
                      key={participant.user_id} 
                      className="relative cursor-pointer hover:z-50 hover:scale-110 transition-transform" 
                      style={{ zIndex: 5 - index }}
                      onClick={() => {
                        if (participant.user_id !== user?.id) {
                          navigate(`/user/${participant.user_id}`);
                        }
                      }}
                    >
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

            {/* Reviews Section */}
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 text-base sm:text-lg">Avaliações</h3>
                  {averageRating !== null && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.round(averageRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Form - Only show if event is completed, user participated, and hasn't reviewed */}
              {isEventCompleted && isParticipating && !userHasReviewed && user && (
                <div className="mb-6">
                  <EventReviewForm
                    eventId={event.id}
                    userId={user.id}
                    onReviewSubmitted={fetchReviews}
                  />
                </div>
              )}

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <div className="text-center py-8 bg-muted/20 rounded-lg">
                  <Star className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isEventCompleted 
                      ? 'Seja o primeiro a avaliar este evento!'
                      : 'As avaliações estarão disponíveis após o evento.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <EventReview
                      key={review.id}
                      review={review}
                      currentUserId={user?.id}
                      onDelete={handleDeleteReview}
                    />
                  ))}
                </div>
              )}
            </div>
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
      <div className="p-3 sm:p-4 bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-20">
        <Button 
          variant={isParticipating ? "outline" : "hero"} 
          className="w-full h-11 sm:h-12 text-sm sm:text-base" 
          onClick={handleParticipate}
          disabled={loading}
        >
          {loading ? 'Carregando...' : isParticipating ? 'Sair do Evento' : 'Participar'}
        </Button>
      </div>
    </div>
  );
};