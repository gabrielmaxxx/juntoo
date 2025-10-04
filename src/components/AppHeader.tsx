import { Bell, MessageCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { NotificationPanel } from './NotificationPanel';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppHeaderProps {
  onEventClick?: (eventId: string) => void;
}

export const AppHeader = ({ onEventClick }: AppHeaderProps) => {
  const { signOut, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleEventClick = (eventId: string) => {
    if (onEventClick) {
      onEventClick(eventId);
    }
  };

  return (
    <>
      <header className="juntoo-gradient p-4 flex items-center justify-between h-20 text-primary-foreground sticky top-0 z-20">
        <h1 className="text-3xl font-bold font-poppins tracking-wide drop-shadow-lg">juntoo</h1>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <MessageCircle size={20} className="text-white" />
          </button>
          <button 
            onClick={() => setShowNotifications(true)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors relative"
          >
            <Bell size={20} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Sair"
          >
            <LogOut size={20} className="text-white" />
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