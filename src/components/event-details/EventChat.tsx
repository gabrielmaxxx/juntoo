import { RefObject } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@supabase/supabase-js';

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

interface EventChatProps {
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: () => void;
  currentUser: User | null;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export const EventChat = ({
  messages,
  newMessage,
  setNewMessage,
  sendMessage,
  currentUser,
  messagesEndRef,
}: EventChatProps) => {
  return (
    <div className="flex-1 flex flex-col h-full">
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
                  </div>
                  <div className={`inline-block mt-1 px-3 py-2 rounded-2xl ${
                    msg.user_id === currentUser?.id 
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
      <div className="p-4 border-t border-border bg-background">
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
    </div>
  );
};
