import { useState, useEffect } from 'react';
import { ArrowLeft, Search, MessageCircle, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useConversations } from '@/hooks/useDirectMessages';
import { useEventConversations, EventConversation } from '@/hooks/useEventConversations';
import { ChatView } from '@/components/ChatView';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface MessagesPageProps {
  onBack?: () => void;
  initialConversationId?: string;
  initialUserId?: string;
  onOpenEventChat?: (eventId: string) => void;
}

type UnifiedConversation =
  | { type: 'dm'; id: string; name: string; avatar: string | null; userId: string; lastMessage: string | null; lastMessageAt: string | null; unreadCount: number }
  | { type: 'event'; eventId: string; title: string; image: string | null; lastMessage: string | null; lastMessageAt: string | null; lastMessageSender: string | null; unreadCount: number };

export const MessagesPage = ({ onBack, initialConversationId, initialUserId, onOpenEventChat }: MessagesPageProps) => {
  const { conversations, loading: dmLoading } = useConversations();
  const { conversations: eventConvs, loading: eventLoading } = useEventConversations();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ name: string; avatar: string | null; userId: string } | null>(null);
  const [search, setSearch] = useState('');

  // Auto-open conversation when navigated with params
  useEffect(() => {
    if (initialConversationId && initialUserId && !selectedConversation) {
      const conv = conversations.find(c => c.id === initialConversationId);
      if (conv) {
        setSelectedConversation(initialConversationId);
        setSelectedUser({ name: conv.other_user.full_name, avatar: conv.other_user.avatar_url, userId: conv.other_user.user_id });
      } else if (!dmLoading) {
        supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', initialUserId)
          .single()
          .then(({ data }) => {
            if (data) {
              setSelectedConversation(initialConversationId);
              setSelectedUser({ name: data.full_name, avatar: data.avatar_url, userId: initialUserId });
            }
          });
      }
    }
  }, [initialConversationId, initialUserId, conversations, dmLoading, selectedConversation]);

  if (selectedConversation && selectedUser) {
    return (
      <ChatView
        conversationId={selectedConversation}
        otherUserName={selectedUser.name}
        otherUserAvatar={selectedUser.avatar}
        otherUserId={selectedUser.userId}
        onBack={() => { setSelectedConversation(null); setSelectedUser(null); }}
      />
    );
  }

  // Build unified list
  const unified: UnifiedConversation[] = [
    ...conversations.map(c => ({
      type: 'dm' as const,
      id: c.id,
      name: c.other_user.full_name,
      avatar: c.other_user.avatar_url,
      userId: c.other_user.user_id,
      lastMessage: c.last_message,
      lastMessageAt: c.last_message_at,
      unreadCount: c.unread_count,
    })),
    ...eventConvs.map(e => ({
      type: 'event' as const,
      eventId: e.event_id,
      title: e.event_title,
      image: e.event_image,
      lastMessage: e.last_message_sender ? `${e.last_message_sender}: ${e.last_message}` : e.last_message,
      lastMessageAt: e.last_message_at,
      lastMessageSender: e.last_message_sender,
      unreadCount: e.unread_count,
    })),
  ];

  // Sort by last message time
  unified.sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  const filtered = unified.filter(c => {
    const label = c.type === 'dm' ? c.name : c.title;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const loading = dmLoading || eventLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        {onBack && (
          <button onClick={onBack} className="p-1 hover:bg-muted rounded-full" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg font-bold text-foreground flex-1">Mensagens</h2>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhuma conversa ainda</p>
            <p className="text-xs mt-1">Acesse o perfil de um usuário para iniciar uma conversa</p>
          </div>
        ) : (
          filtered.map(conv => {
            if (conv.type === 'dm') {
              return (
                <button
                  key={`dm-${conv.id}`}
                  onClick={() => {
                    setSelectedConversation(conv.id);
                    setSelectedUser({ name: conv.name, avatar: conv.avatar, userId: conv.userId });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conv.avatar || ''} alt={conv.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {conv.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                        {conv.name}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {conv.lastMessage}
                      </p>
                    )}
                  </div>
                </button>
              );
            }

            // Event conversation
            return (
              <button
                key={`event-${conv.eventId}`}
                onClick={() => onOpenEventChat?.(conv.eventId)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="relative">
                  <Avatar className="w-12 h-12 rounded-xl">
                    <AvatarImage src={conv.image || ''} alt={conv.title} className="rounded-xl" />
                    <AvatarFallback className="bg-accent/20 text-accent-foreground font-medium rounded-xl">
                      <Users className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                  {/* Group indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 bg-muted border border-border rounded-full p-0.5">
                    <Users className="w-2.5 h-2.5 text-muted-foreground" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                      {conv.title}
                    </span>
                    {conv.lastMessageAt && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
