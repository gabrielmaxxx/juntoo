import { Bell, MessageCircle, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationPanel } from './NotificationPanel';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversations } from '@/hooks/useDirectMessages';
import { useEventUnreadCount } from '@/hooks/useEventUnreadCount';
import logoTextWhite from '@/assets/logo-text-white.png';
import { useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  onEventClick?: (eventId: string) => void;
  onMessagesClick?: () => void;
  onSettingsClick?: () => void;
}

export const AppHeader = ({ onEventClick, onMessagesClick, onSettingsClick }: AppHeaderProps) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { totalUnread } = useConversations();
  const { totalUnread: eventUnread } = useEventUnreadCount();
  const combinedUnread = totalUnread + eventUnread;

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const cleanup = subscribeToNotifications();
      return cleanup;
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .neq('type', 'new_message');
    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return () => {};
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

  const Badge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
      <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" aria-hidden="true">
        {count > 9 ? '9+' : count}
      </span>
    );
  };

  return (
    <>
      <header 
        className="juntoo-gradient px-5 flex items-center justify-between h-14 text-primary-foreground sticky top-0 z-20 safe-area-inset-top"
        role="banner"
      >
        <BrandLogo size="sm" showLabel labelClassName="text-lg tracking-[0.22em]" />
        
        <div className="flex items-center gap-1" role="toolbar" aria-label="Ações do usuário">
          <button 
            className="p-2.5 hover:bg-white/15 rounded-full transition-all duration-200 focus-highlight relative"
            aria-label={`Mensagens${combinedUnread > 0 ? `, ${combinedUnread} não lidas` : ''}`}
            onClick={onMessagesClick}
          >
            <MessageCircle size={20} aria-hidden="true" />
            <Badge count={combinedUnread} />
          </button>
          <button 
            onClick={() => setShowNotifications(true)}
            className="p-2.5 hover:bg-white/15 rounded-full transition-all duration-200 relative focus-highlight"
            aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
          >
            <Bell size={20} aria-hidden="true" />
            <Badge count={unreadCount} />
          </button>
          <button
            onClick={onSettingsClick}
            className="p-2.5 hover:bg-white/15 rounded-full transition-all duration-200 focus-highlight"
            aria-label="Configurações"
          >
            <Settings size={20} aria-hidden="true" />
          </button>
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
