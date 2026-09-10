import { useState, useEffect, useRef } from 'react';
import { Event } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { markEventMessagesRead } from '@/hooks/useEventConversations';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { haptic } from '@/lib/haptics';

interface Participant {
  user_id: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Message {
  id: string;
  event_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Review {
  id: string;
  user_id: string;
  event_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Creator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export const useEventDetails = (event: Event) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isParticipating, setIsParticipating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [creator, setCreator] = useState<Creator | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [isEventCompleted, setIsEventCompleted] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const checkParticipation = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsParticipating(!!data);
    } catch {
      setIsParticipating(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data: participantData, error: participantError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', event.id);

      if (participantError) throw participantError;

      if (!participantData || participantData.length === 0) {
        setParticipants([]);
        return;
      }

      const userIds = participantData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const participantsWithProfiles = participantData.map(participant => ({
        user_id: participant.user_id,
        profiles: profilesData?.find(p => p.user_id === participant.user_id)
      }));

      setParticipants(participantsWithProfiles);
      
      // Check if event is full
      if (event.maxParticipants) {
        setIsFull(participantData.length >= event.maxParticipants);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('event_messages')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Fetch profiles for message authors
      const userIds = [...new Set(messagesData.map(m => m.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      const messagesWithProfiles: Message[] = messagesData.map(msg => ({
        id: msg.id,
        event_id: msg.event_id,
        user_id: msg.user_id,
        message: msg.message,
        created_at: msg.created_at,
        profiles: profilesMap.get(msg.user_id) || {
          full_name: 'Usuário',
          avatar_url: null
        }
      }));

      setMessages(messagesWithProfiles);
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
      // First fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('event_reviews')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        setAverageRating(null);
        return;
      }

      // Fetch profiles for reviewers
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      const reviewsWithProfiles: Review[] = reviewsData.map(review => ({
        id: review.id,
        user_id: review.user_id,
        event_id: review.event_id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        profiles: profilesMap.get(review.user_id) || {
          full_name: 'Usuário',
          avatar_url: null
        }
      }));

      setReviews(reviewsWithProfiles);

      if (reviewsWithProfiles.length > 0) {
        const avg = reviewsWithProfiles.reduce((sum, review) => sum + review.rating, 0) / reviewsWithProfiles.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setAverageRating(null);
      }

      if (user) {
        const userReview = reviewsWithProfiles.find(review => review.user_id === user.id);
        setUserHasReviewed(!!userReview);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      // Store review data for potential undo
      const { data: reviewData } = await supabase
        .from('event_reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      const { error } = await supabase
        .from('event_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      haptic('medium');
      toast({
        title: 'Avaliação removida',
        description: 'Sua avaliação foi removida com sucesso.',
        action: reviewData ? (
          <ToastAction
            altText="Desfazer remoção da avaliação"
            onClick={async () => {
              try {
                await supabase.from('event_reviews').insert({
                  event_id: reviewData.event_id,
                  user_id: reviewData.user_id,
                  rating: reviewData.rating,
                  comment: reviewData.comment,
                });
                haptic('success');
                fetchReviews();
                toast({ title: 'Avaliação restaurada' });
              } catch {
                toast({ title: 'Erro ao restaurar', variant: 'destructive' });
              }
            }}
          >
            Desfazer
          </ToastAction>
        ) : undefined,
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
    
    const optimisticMessage: Message = {
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
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageText);
      toast({
        title: 'Erro',
        description: error instanceof Error && error.message.includes('20 mensagens')
          ? 'Contas novas podem enviar no máximo 20 mensagens por hora.'
          : 'Não foi possível enviar a mensagem',
        variant: 'destructive'
      });
    }
  };

  const handleParticipate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (isParticipating) {
        const { error } = await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsParticipating(false);
        haptic('medium');
        toast({
          title: "Você saiu do evento",
          description: "Esperamos te ver em outro evento em breve! 👋",
          action: (
            <ToastAction
              altText="Desfazer saída do evento"
              onClick={async () => {
                try {
                  await supabase.from('event_participants').insert({ event_id: event.id, user_id: user.id });
                  setIsParticipating(true);
                  haptic('success');
                  fetchParticipants();
                  toast({ title: 'Participação restaurada! 🎉' });
                } catch {
                  toast({ title: 'Erro ao restaurar', variant: 'destructive' });
                }
              }}
            >
              Entrar novamente
            </ToastAction>
          ),
        });
      } else {
        // Check if event is full
        if (event.maxParticipants) {
          const { count: currentCount } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);
          
          if (currentCount && currentCount >= event.maxParticipants) {
            haptic('error');
            toast({
              title: "Evento lotado! 😔",
              description: `Este evento já atingiu o limite de ${event.maxParticipants} participantes.`,
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        }

        const { data: existing } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          setIsParticipating(true);
          toast({
            title: "Você já participa! ✌️",
            description: "Você já está inscrito neste evento.",
          });
          return;
        }

        const { error } = await supabase
          .from('event_participants')
          .insert({
            event_id: event.id,
            user_id: user.id
          });

        if (error) throw error;

        setIsParticipating(true);
        haptic('success');

        // Send welcome system message in chat
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();
          const name = profile?.full_name || 'Alguém';
          await supabase.from('event_messages').insert({
            event_id: event.id,
            user_id: user.id,
            message: `👋 ${name} entrou no evento!`,
          });
        } catch {
          // Non-critical, ignore
        }
        
        // Fetch updated participants to show count
        const { count } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        
        const participantCount = count || 1;
        const celebrationMessages = [
          "Você está dentro! Nos vemos lá! 🎉",
          "Presença confirmada! Vai ser incrível! 🚀",
          "Tudo certo! Você está na lista! ✅",
        ];
        const randomMsg = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
        
        toast({
          title: randomMsg,
          description: participantCount > 1 
            ? `${participantCount} pessoas já confirmaram presença` 
            : "Você é o primeiro! Convide seus amigos.",
        });
      }
      
      fetchParticipants();
    } catch (error) {
      console.error('Error with participation:', error);
      toast({
        title: "Não foi possível concluir",
        description: getFriendlyError(error, 'event_join'),
        variant: "destructive"
      });

    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch — parallelized
  useEffect(() => {
    const loadData = async () => {
      checkIfEventCompleted();
      // Run all independent fetches in parallel
      await Promise.all([
        user ? checkParticipation() : Promise.resolve(),
        user ? fetchParticipants() : Promise.resolve(),
        fetchCreator(),
        fetchReviews(),
      ]);
    };
    loadData();
  }, [user, event.id]);

  // Fetch messages when participating and subscribe to realtime updates
  useEffect(() => {
    if (isParticipating) {
      fetchMessages();
      if (user) {
        markEventMessagesRead(user.id, event.id);
      }
      
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
          async (payload) => {
            const newMsg = payload.new as { id: string; event_id: string; user_id: string; message: string; created_at: string };
            
            // Skip if it's our own optimistic message (already in state)
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              // For messages from other users, fetch their profile
              return prev; // Will be updated below
            });

            // Fetch profile and add message
            const { data: profileData } = await supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url')
              .eq('user_id', newMsg.user_id)
              .single();
            
            const messageWithProfile: Message = {
              ...newMsg,
              profiles: profileData || { full_name: 'Usuário', avatar_url: null }
            };
            
            setMessages(prev => {
              // Remove temp messages from same user and deduplicate
              const filtered = prev.filter(m => {
                if (m.id === newMsg.id) return false;
                // Remove optimistic temp message if this is from same user
                if (m.id.startsWith('temp-') && m.user_id === newMsg.user_id && m.message === newMsg.message) return false;
                return true;
              });
              return [...filtered, messageWithProfile];
            });
            
            if (user) {
              markEventMessagesRead(user.id, event.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isParticipating, event.id, user]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cancelEvent = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)
        .eq('created_by', user.id);
      if (error) throw error;
      haptic('success');
      toast({ title: 'Evento cancelado', description: 'O evento foi removido com sucesso.' });
      return true;
    } catch (error) {
      console.error('Error cancelling event:', error);
      toast({ title: 'Erro', description: 'Não foi possível cancelar o evento.', variant: 'destructive' });
      return false;
    }
  };

  const updateEvent = async (updates: { title?: string; description?: string; location?: string; date?: string; time?: string }) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', event.id)
        .eq('created_by', user.id);
      if (error) throw error;
      haptic('success');
      toast({ title: 'Evento atualizado! ✅' });
      return true;
    } catch (error) {
      console.error('Error updating event:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o evento.', variant: 'destructive' });
      return false;
    }
  };

  return {
    user,
    isParticipating,
    loading,
    participants,
    messages,
    newMessage,
    setNewMessage,
    creator,
    reviews,
    averageRating,
    userHasReviewed,
    isEventCompleted,
    isFull,
    messagesEndRef,
    sendMessage,
    handleParticipate,
    handleDeleteReview,
    fetchReviews,
    cancelEvent,
    updateEvent,
  };
};

export const formatDateTime = (date: string, time: string) => {
  const eventDate = new Date(`${date}T${time}`);
  return eventDate.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
};
