import { Bell, MessageCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { NotificationPanel } from './NotificationPanel';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversations } from '@/hooks/useDirectMessages';
import { BrandLogo } from './BrandLogo';

interface AppHeaderProps {
  onEventClick?: (eventId: string) => void;
  onMessagesClick?: () => void;
}

export const AppHeader = ({ onEventClick, onMessagesClick }: AppHeaderProps) => {
  const { signOut, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { totalUnread } = useConversations();

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      subscribeToNotifications();
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;
    const channel = supabase
      .channel('notification-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        loadUnreadCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const handleEventClick = (eventId: string) => {
    if (onEventClick) onEventClick(eventId);
  };

  return (
    <>
      <header 
        className="juntoo-gradient px-4 flex items-center justify-between h-16 sm:h-20 text-primary-foreground sticky top-0 z-20 safe-area-inset-top"
        role="banner"
      >
        <BrandLogo size="sm" showLabel labelClassName="text-lg sm:text-xl tracking-[0.22em]" />
        
        <div className="flex items-center space-x-4" role="toolbar" aria-label="Ações do usuário">
          <button 
            className="p-2 hover:bg-white/20 rounded-full transition-colors focus-highlight relative"
            aria-label={`Mensagens${totalUnread > 0 ? `, ${totalUnread} não lidas` : ''}`}
            onClick={onMessagesClick}
          >
            <MessageCircle size={20} className="text-white" aria-hidden="true" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
          <button 
            onClick={() => setShowNotifications(true)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors relative focus-highlight"
            aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
          >
            <Bell size={20} className="text-white" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Sair da conta"
          >
            <LogOut size={20} className="text-white" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <NotificationPanel
        open={showNotifications}
        onOpenChange={setShowNotifications}
        onEventClick={handleEventClick}
      />
    </>
  );
};
