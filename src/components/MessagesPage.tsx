import { useState } from 'react';
import { ArrowLeft, Search, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useConversations } from '@/hooks/useDirectMessages';
import { ChatView } from '@/components/ChatView';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface MessagesPageProps {
  onBack?: () => void;
}

export const MessagesPage = ({ onBack }: MessagesPageProps) => {
  const { conversations, loading } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ name: string; avatar: string | null } | null>(null);
  const [search, setSearch] = useState('');

  if (selectedConversation && selectedUser) {
    return (
      <ChatView
        conversationId={selectedConversation}
        otherUserName={selectedUser.name}
        otherUserAvatar={selectedUser.avatar}
        onBack={() => { setSelectedConversation(null); setSelectedUser(null); }}
      />
    );
  }

  const filtered = conversations.filter(c =>
    c.other_user.full_name.toLowerCase().includes(search.toLowerCase())
  );

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
          filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => {
                setSelectedConversation(conv.id);
                setSelectedUser({ name: conv.other_user.full_name, avatar: conv.other_user.avatar_url });
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={conv.other_user.avatar_url || ''} alt={conv.other_user.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {conv.other_user.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {conv.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                    {conv.other_user.full_name}
                  </span>
                  {conv.last_message_at && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {conv.last_message}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
