/**
 * EventChat — chat por evento com Supabase Realtime.
 *
 * Features:
 *  - Agrupamento de mensagens por usuário/tempo (2 min)
 *  - Optimistic UI com status (enviando → enviada → entregue)
 *  - Indicador de digitação + presença online
 *  - Indicador de "novo conteúdo" ao scrollar para cima
 *  - Input expansível estilo WhatsApp (até 4 linhas)
 *  - Envio com Enter (desktop) / botão (mobile)
 *  - Mensagens de sistema com badge
 *  - Menu de contexto: reportar / apagar
 *  - Virtual scroll via @tanstack/react-virtual
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  ChevronDown,
  MoreVertical,
  Trash2,
  Flag,
  ShieldAlert,
  AlertTriangle,
  Pin,
  PinOff,
  MapPin,
  Calendar,
  Users,
  UserPlus,
  Check,
  CheckCheck,
  Loader2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportButton } from '@/components/reports';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/hooks/useEventDetails';
import {
  useEventChat,
  formatRelativeTime,
  type ChatMessage,
  type MessageGroup,
} from '../hooks/useEventChat';

// ─── Props ────────────────────────────────────────────────

interface EventChatEnhancedProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  createdBy: string;
  isParticipating: boolean;
  isEventPast?: boolean;
}

// ─── Status Icon ──────────────────────────────────────────

const MessageStatus = ({ status }: { status: ChatMessage['status'] }) => {
  if (status === 'sending')
    return <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />;
  if (status === 'sent')
    return <Check className="h-3 w-3 text-muted-foreground" />;
  return <CheckCheck className="h-3 w-3 text-primary" />;
};

// ─── System Message ───────────────────────────────────────

const SystemMessage = ({ message }: { message: ChatMessage }) => {
  const isJoin = message.message.includes('entrou no evento');
  const isReminder = message.message.includes('Confirme sua presença');

  if (isReminder) {
    return (
      <div className="flex justify-center py-2">
        <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-2.5 max-w-[85%]">
          <div className="flex items-center gap-2 text-warning text-xs font-medium">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{message.message}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
        {isJoin && <UserPlus className="h-3 w-3" />}
        {message.message}
      </span>
    </div>
  );
};

// ─── Message Group Renderer ──────────────────────────────

const MessageGroupView = ({
  group,
  currentUserId,
  createdBy,
  onDelete,
  pinnedIds,
  onTogglePin,
}: {
  group: MessageGroup;
  currentUserId: string | undefined;
  createdBy: string;
  onDelete: (id: string) => void;
  pinnedIds: Set<string>;
  onTogglePin: (id: string) => void;
}) => {
  if (group.isSystem) {
    return (
      <>
        {group.messages.map((msg) => (
          <SystemMessage key={msg.id} message={msg} />
        ))}
      </>
    );
  }

  const isOwn = group.isCurrentUser;
  const isCreator = currentUserId === createdBy;

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} mb-3`}>
      {/* Avatar - only for first message of group */}
      {!isOwn ? (
        group.avatarUrl ? (
          <img
            src={group.avatarUrl}
            alt={group.userName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-medium text-primary">
              {group.userName.charAt(0).toUpperCase()}
            </span>
          </div>
        )
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      <div className={`flex-1 min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Name + time of first message */}
        <div
          className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}
        >
          <span className="text-xs font-medium text-foreground">
            {isOwn ? 'Você' : group.userName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(group.messages[0].created_at)}
          </span>
        </div>

        {/* Messages in group */}
        {group.messages.map((msg, idx) => {
          const isPinned = pinnedIds.has(msg.id);
          const isTemp = msg.id.startsWith('temp-');

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-1 ${isOwn ? 'flex-row-reverse self-end' : 'self-start'} group ${
                idx > 0 ? 'mt-0.5' : ''
              }`}
            >
              <div
                className={`relative inline-block px-3 py-1.5 max-w-[75vw] sm:max-w-[400px] ${
                  isOwn
                    ? `bg-primary text-primary-foreground ${
                        idx === 0
                          ? 'rounded-2xl rounded-tr-md'
                          : idx === group.messages.length - 1
                          ? 'rounded-2xl rounded-br-md'
                          : 'rounded-xl rounded-r-md'
                      }`
                    : `bg-muted text-foreground ${
                        idx === 0
                          ? 'rounded-2xl rounded-tl-md'
                          : idx === group.messages.length - 1
                          ? 'rounded-2xl rounded-bl-md'
                          : 'rounded-xl rounded-l-md'
                      }`
                } ${isPinned ? 'ring-1 ring-primary/30' : ''} ${
                  msg.is_deleted ? 'italic opacity-60' : ''
                }`}
              >
                <p className="text-sm break-words whitespace-pre-wrap">
                  {msg.message}
                </p>

                {/* Status + time for subsequent messages */}
                {idx > 0 && (
                  <span
                    className={`text-[10px] mt-0.5 block ${
                      isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
                    }`}
                  >
                    {formatRelativeTime(msg.created_at)}
                  </span>
                )}
              </div>

              {/* Status icon for own messages */}
              {isOwn && !msg.is_deleted && (
                <div className="flex-shrink-0 mb-1">
                  <MessageStatus status={msg.status} />
                </div>
              )}

              {/* Pinned indicator */}
              {isPinned && (
                <Pin className="h-3 w-3 text-primary flex-shrink-0 mb-1" />
              )}

              {/* Context menu */}
              {!isTemp && !msg.is_deleted && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mb-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-muted rounded text-muted-foreground">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-40">
                      {isOwn && (
                        <DropdownMenuItem
                          onClick={() => onDelete(msg.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Apagar
                        </DropdownMenuItem>
                      )}
                      {isCreator && (
                        <DropdownMenuItem onClick={() => onTogglePin(msg.id)}>
                          {isPinned ? (
                            <>
                              <PinOff className="h-3.5 w-3.5 mr-2" />
                              Desafixar
                            </>
                          ) : (
                            <>
                              <Pin className="h-3.5 w-3.5 mr-2" />
                              Fixar
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                      {!isOwn && (
                        <DropdownMenuItem asChild>
                          <ReportButton
                            reportedUserId={msg.user_id}
                            reportedMessageId={msg.id}
                            contextLabel="Reportar"
                            size="icon"
                          />
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────

export const EventChatEnhanced = ({
  eventId,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  createdBy,
  isParticipating,
  isEventPast = false,
}: EventChatEnhancedProps) => {
  const { isFeatureBlocked } = useAuthContext();
  const commentsBlocked = isFeatureBlocked('comments');

  const {
    messageGroups,
    messages,
    loading,
    typingUsers,
    onlineUsers,
    rateLimited,
    hasNewBelow,
    setHasNewBelow,
    sendMessage,
    notifyTyping,
    deleteMessage,
  } = useEventChat(eventId, isParticipating);

  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Pinned messages
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const { user } = useAuthContext();

  useEffect(() => {
    const fetchPinned = async () => {
      const { data } = await supabase
        .from('pinned_messages')
        .select('message_id')
        .eq('event_id', eventId);
      if (data) setPinnedIds(new Set(data.map((p) => p.message_id)));
    };
    fetchPinned();
  }, [eventId]);

  const handleTogglePin = async (messageId: string) => {
    if (!user) return;
    if (pinnedIds.has(messageId)) {
      await supabase
        .from('pinned_messages')
        .delete()
        .eq('event_id', eventId)
        .eq('message_id', messageId);
      setPinnedIds((prev) => {
        const s = new Set(prev);
        s.delete(messageId);
        return s;
      });
    } else {
      await supabase.from('pinned_messages').insert({
        event_id: eventId,
        message_id: messageId,
        pinned_by: user.id,
      });
      setPinnedIds((prev) => new Set(prev).add(messageId));
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setHasNewBelow(true);
    }
  }, [messages.length]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 100;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isAtBottomRef.current = atBottom;
    if (atBottom) setHasNewBelow(false);
  }, [setHasNewBelow]);

  // Scroll to bottom
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewBelow(false);
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    notifyTyping();

    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`; // max 4 lines ~96px
  };

  // Send handler
  const handleSend = () => {
    if (!inputText.trim() || rateLimited) return;
    sendMessage(inputText);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    // Scroll to bottom after sending
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // Enter to send (desktop)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Pinned message preview
  const lastPinned = messages.filter((m) => pinnedIds.has(m.id)).pop();

  return (
    <div className="flex flex-col h-full">
      {/* Event context header */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 space-y-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground truncate">{eventTitle}</p>
          {onlineUsers.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-success">
              <Circle className="h-2 w-2 fill-success" />
              {onlineUsers.length} online
            </span>
          )}
        </div>
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

      {/* Pinned message bar */}
      {lastPinned && (
        <div className="px-4 py-2 border-b border-border bg-primary/5 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Pin className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="text-primary font-medium truncate">
              {lastPinned.profiles?.full_name}: {lastPinned.message}
            </span>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Seja o primeiro a enviar uma mensagem!
            </p>
          </div>
        ) : (
          <>
            {messageGroups.map((group, idx) => (
              <MessageGroupView
                key={`${group.userId}-${group.messages[0].id}`}
                group={group}
                currentUserId={user?.id}
                createdBy={createdBy}
                onDelete={deleteMessage}
                pinnedIds={pinnedIds}
                onTogglePin={handleTogglePin}
              />
            ))}
          </>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-2 py-1"
            >
              <div className="flex -space-x-1">
                {typingUsers.slice(0, 3).map((u) =>
                  u.avatar_url ? (
                    <img
                      key={u.user_id}
                      src={u.avatar_url}
                      alt={u.full_name}
                      className="w-5 h-5 rounded-full border border-background object-cover"
                    />
                  ) : (
                    <div
                      key={u.user_id}
                      className="w-5 h-5 rounded-full bg-primary/10 border border-background flex items-center justify-center"
                    >
                      <span className="text-[8px] font-medium text-primary">
                        {u.full_name.charAt(0)}
                      </span>
                    </div>
                  )
                )}
              </div>
              <span className="text-xs text-muted-foreground italic">
                {typingUsers.length === 1
                  ? `${typingUsers[0].full_name} está digitando`
                  : `${typingUsers.length} pessoas digitando`}
                <span className="inline-flex ml-0.5">
                  <span className="animate-bounce delay-0">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>.</span>
                </span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* New content indicator */}
      <AnimatePresence>
        {hasNewBelow && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10"
          >
            <button
              onClick={scrollToBottom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Novas mensagens
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-3 border-t border-border bg-background flex-shrink-0">
        {isEventPast ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Evento encerrado. Chat em modo leitura.</span>
          </div>
        ) : commentsBlocked ? (
          <div className="flex items-center gap-2 text-sm text-destructive justify-center py-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Envio bloqueado por um moderador.</span>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={rateLimited ? 'Aguarde um momento...' : 'Mensagem...'}
              disabled={rateLimited}
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-input bg-muted/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 max-h-24 min-h-[40px] scrollbar-hide"
              style={{ height: 'auto' }}
            />
            <Button
              onClick={handleSend}
              disabled={!inputText.trim() || rateLimited}
              size="icon"
              className="rounded-full h-10 w-10 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
