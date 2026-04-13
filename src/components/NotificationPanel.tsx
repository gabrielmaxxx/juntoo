import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { getNotificationConfig, NOTIFICATION_CATEGORIES } from '@/constants/notifications';
import { Sparkles } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  event_id: string | null;
  created_at: string;
}

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventClick: (eventId: string) => void;
}

export const NotificationPanel = ({ open, onOpenChange, onEventClick }: NotificationPanelProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  useEffect(() => {
    if (open && user) loadNotifications();
  }, [open, user]);

  const loadNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .neq('type', 'new_message')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { console.error('Error loading notifications:', error); return; }
    setNotifications((data || []) as Notification[]);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (error) return;
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    if (error) return;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleAcceptFriendRequest = async (friendshipId: string, notificationId: string) => {
    try {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      if (error) throw error;
      await deleteNotification(notificationId);
      toast({ title: 'Solicitação aceita!', description: 'Você agora são amigos.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível aceitar a solicitação.', variant: 'destructive' });
    }
  };

  const handleRejectFriendRequest = async (friendshipId: string, notificationId: string) => {
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
      await deleteNotification(notificationId);
      toast({ title: 'Solicitação rejeitada' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível rejeitar a solicitação.', variant: 'destructive' });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'friend_request') return;
    if (notification.event_id) {
      markAsRead(notification.id);
      onEventClick(notification.event_id);
      onOpenChange(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => {
        const config = getNotificationConfig(n.type);
        return config.category === filter;
      });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 font-heading">
              <Bell className="w-5 h-5" />
              Notificações
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Category filter tabs */}
        <div className="px-4 pb-2">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="w-full h-8 p-0.5">
              {NOTIFICATION_CATEGORIES.map(cat => (
                <TabsTrigger key={cat.key} value={cat.key} className="text-xs flex-1 h-7">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1 px-4 pb-4">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary opacity-60" />
              </div>
              <div>
                <p className="font-heading font-semibold text-foreground">Tudo em dia!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === 'all'
                    ? 'Quando algo acontecer, você verá aqui.'
                    : 'Nenhuma notificação nesta categoria.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const config = getNotificationConfig(notification.type);
                const Icon = config.icon;
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 rounded-xl border transition-all group ${
                      notification.type === 'friend_request' ? '' : 'cursor-pointer'
                    } ${
                      notification.read
                        ? 'bg-background hover:bg-accent/50 border-border/40'
                        : 'bg-primary/5 hover:bg-primary/10 border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-semibold ${notification.read ? 'text-foreground/80' : 'text-foreground'}`}>
                            {notification.title}
                          </h4>
                          {notification.type !== 'friend_request' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                              onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                              aria-label={`Excluir notificação: ${notification.title}`}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                        {notification.type === 'friend_request' && notification.event_id && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAcceptFriendRequest(notification.event_id!, notification.id); }} className="flex-1 h-8 text-xs">Aceitar</Button>
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRejectFriendRequest(notification.event_id!, notification.id); }} className="flex-1 h-8 text-xs">Rejeitar</Button>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1.5">{formatTime(notification.created_at)}</p>
                      </div>
                      {/* Unread dot */}
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
