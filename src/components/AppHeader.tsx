import { Bell, MessageCircle, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { lazy, Suspense, useState } from 'react';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import logoTextWhite from '@/assets/logo-text-white.png';
import { useNavigate } from 'react-router-dom';

const NotificationPanel = lazy(() => import('./NotificationPanel').then(m => ({ default: m.NotificationPanel })));

interface AppHeaderProps {
  onEventClick?: (eventId: string) => void;
  onMessagesClick?: () => void;
  onSettingsClick?: () => void;
}

export const AppHeader = ({ onEventClick, onMessagesClick, onSettingsClick }: AppHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const { totalMessageUnread, notifUnread } = useUnreadCounts();

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
        <button 
          onClick={() => navigate('/')}
          className="flex items-center cursor-pointer focus-highlight"
          aria-label="Ir para o início"
        >
          <img 
            src={logoTextWhite} 
            alt="Juntoo" 
            className="h-6 w-auto object-contain"
          />
        </button>
        
        <div className="flex items-center gap-1" role="toolbar" aria-label="Ações do usuário">
          <button 
            className="p-2.5 hover:bg-white/15 rounded-full transition-all duration-200 focus-highlight relative"
            aria-label={`Mensagens${totalMessageUnread > 0 ? `, ${totalMessageUnread} não lidas` : ''}`}
            onClick={onMessagesClick}
          >
            <MessageCircle size={20} aria-hidden="true" />
            <Badge count={totalMessageUnread} />
          </button>
          <button 
            onClick={() => setShowNotifications(true)}
            className="p-2.5 hover:bg-white/15 rounded-full transition-all duration-200 relative focus-highlight"
            aria-label={`Notificações${notifUnread > 0 ? `, ${notifUnread} não lidas` : ''}`}
          >
            <Bell size={20} aria-hidden="true" />
            <Badge count={notifUnread} />
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
