import { RefObject, useState, useEffect, useCallback } from 'react';
import { Send, ShieldAlert, Pin, PinOff, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@supabase/supabase-js';
import { ReportButton } from '@/components/reports';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/hooks/useEventDetails';

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

interface PinnedMessage {
  id: string;
  message_id: string;
  event_id: string;
}

interface EventChatProps {
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: () => void;
  currentUser: User | null;
  messagesEndRef: RefObject<HTMLDivElement>;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  createdBy: string;
  isEventPast?: boolean;
}

const RATE_LIMIT_MS = 1500; // 1.5s between messages
const RATE_LIMIT_BURST = 5; // max 5 messages in 10s window
const RATE_LIMIT_WINDOW = 10000;

export const EventChat = ({
  messages,
  newMessage,
  setNewMessage,
  sendMessage,
  currentUser,
  messagesEndRef,
  eventId,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  createdBy,
  isEventPast = false,
}: EventChatProps) => {
  const { isFeatureBlocked } = useAuthContext();
  const commentsBlocked = isFeatureBlocked('comments');
  const isCreator = currentUser?.id === createdBy;

  // Rate limiting state
  const [lastSentAt, setLastSentAt] = useState(0);
  const [recentSends, setRecentSends] = useState<number[]>([]);
  const [rateLimited, setRateLimited] = useState(false);

  // Pinned messages
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchPinned = async () => {
      const { data } = await supabase
        .from('pinned_messages')
        .select('message_id')
        .eq('event_id', eventId);
      if (data) {
        setPinnedMessageIds(new Set(data.map(p => p.message_id)));
      }
    };
    fetchPinned();
  }, [eventId]);

  const handlePin = async (messageId: string) => {
    if (pinnedMessageIds.has(messageId)) {
      await supabase.from('pinned_messages').delete().eq('event_id', eventId).eq('message_id', messageId);
      setPinnedMessageIds(prev => { const s = new Set(prev); s.delete(messageId); return s; });
    } else {
      await supabase.from('pinned_messages').insert({ event_id: eventId, message_id: messageId, pinned_by: currentUser!.id });
      setPinnedMessageIds(prev => new Set(prev).add(messageId));
    }
  };

  const handleSendWithRateLimit = useCallback(() => {
    const now = Date.now();
    
    // Check cooldown
    if (now - lastSentAt < RATE_LIMIT_MS) {
      setRateLimited(true);
      setTimeout(() => setRateLimited(false), RATE_LIMIT_MS);
      return;
    }

    // Check burst
    const recentWindow = recentSends.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (recentWindow.length >= RATE_LIMIT_BURST) {
      setRateLimited(true);
      setTimeout(() => setRateLimited(false), 3000);
      return;
    }

    setLastSentAt(now);
    setRecentSends([...recentWindow, now]);
    setRateLimited(false);
    sendMessage();
  }, [lastSentAt, recentSends, sendMessage]);

  // Get pinned messages content
  const pinnedMessages = messages.filter(m => pinnedMessageIds.has(m.id));

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Event context header */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 space-y-1">
        <p className="text-sm font-semibold text-foreground truncate">{eventTitle}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDateTime(eventDate, eventTime)}
          </span>
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {eventLocation}
          </span>
        </div>
      </div>

      {/* Pinned messages bar */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 text-xs">
            <Pin className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="text-primary font-medium truncate">
              {pinnedMessages[pinnedMessages.length - 1]?.profiles?.full_name}: {pinnedMessages[pinnedMessages.length - 1]?.message}
            </span>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Seja o primeiro a enviar uma mensagem!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isPinned = pinnedMessageIds.has(msg.id);
              const isSystem = msg.user_id === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center py-1">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-2 ${msg.user_id === currentUser?.id ? 'flex-row-reverse' : ''}`}
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
                  <div className={`flex-1 ${msg.user_id === currentUser?.id ? 'text-right' : ''}`}>
                    <div className={`flex items-baseline gap-2 ${msg.user_id === currentUser?.id ? 'justify-end' : ''}`}>
                      <p className="text-xs font-medium text-foreground">
                        {msg.profiles?.full_name || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {isPinned && <Pin className="w-3 h-3 text-primary inline" />}
                    </div>
                    <div className={`inline-block mt-1 px-3 py-2 rounded-2xl ${
                      msg.user_id === currentUser?.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    } ${isPinned ? 'ring-1 ring-primary/30' : ''}`}>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-0.5 ${msg.user_id === currentUser?.id ? 'justify-end' : ''}`}>
                      {isCreator && !msg.id.startsWith('temp-') && (
                        <button
                          onClick={() => handlePin(msg.id)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          title={isPinned ? 'Desafixar' : 'Fixar mensagem'}
                        >
                          {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>
                      )}
                      {msg.user_id !== currentUser?.id && (
                        <ReportButton
                          reportedUserId={msg.user_id}
                          reportedMessageId={msg.id}
                          contextLabel="Denunciar esta mensagem"
                          size="icon"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-border bg-background">
        {isEventPast ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Este evento já foi encerrado. O chat está em modo leitura.</span>
          </div>
        ) : commentsBlocked ? (
          <div className="flex items-center gap-2 text-sm text-destructive justify-center py-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Envio de comentários bloqueado por um moderador.</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendWithRateLimit()}
              placeholder={rateLimited ? "Aguarde um momento..." : "Digite sua mensagem..."}
              className="flex-1"
              disabled={rateLimited}
            />
            <Button 
              onClick={handleSendWithRateLimit} 
              disabled={!newMessage.trim() || rateLimited}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
