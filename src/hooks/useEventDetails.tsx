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
        
        // Fetch updated participants to show count
        const { count } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        
        const participantCount = count || 1;
        const messages = [
          "Você está dentro! Nos vemos lá! 🎉",
          "Presença confirmada! Vai ser incrível! 🚀",
          "Tudo certo! Você está na lista! ✅",
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        
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
        title: "Erro",
        description: "Não foi possível processar sua solicitação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user) {
      checkParticipation();
      fetchParticipants();
    }
    fetchCreator();
    fetchReviews();
    checkIfEventCompleted();
  }, [user, event.id]);

  // Real-time messages subscription
  useEffect(() => {
    if (isParticipating) {
      fetchMessages();
      
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
          () => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isParticipating, event.id]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    messagesEndRef,
    sendMessage,
    handleParticipate,
    handleDeleteReview,
    fetchReviews,
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
