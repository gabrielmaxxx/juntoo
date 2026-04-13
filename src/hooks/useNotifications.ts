import { useCallback, useMemo } from 'react';
import { usePushNotifications } from './usePushNotifications';
import { useUnreadCounts } from './useUnreadCounts';
import { toast } from '@/hooks/use-toast';

const OPT_IN_DISMISSED_KEY = 'juntoo_notif_optin_dismissed';
const OPT_IN_REMIND_KEY = 'juntoo_notif_optin_remind_at';

/**
 * Unified notification hook that combines push + in-app notifications.
 * Provides contextual opt-in logic and fallback to toasts.
 */
export function useNotifications() {
  const push = usePushNotifications();
  const unread = useUnreadCounts();

  /**
   * Whether the opt-in modal should be shown.
   * Only shows if push is supported, not yet subscribed, and not dismissed/snoozed.
   */
  const shouldShowOptIn = useMemo(() => {
    if (!push.isSupported || push.isSubscribed || push.isLoading) return false;
    
    const dismissed = localStorage.getItem(OPT_IN_DISMISSED_KEY);
    if (dismissed === 'permanent') return false;

    const remindAt = localStorage.getItem(OPT_IN_REMIND_KEY);
    if (remindAt && Date.now() < parseInt(remindAt, 10)) return false;

    return true;
  }, [push.isSupported, push.isSubscribed, push.isLoading]);

  /**
   * Request push permission with in-app toast fallback.
   */
  const requestPermission = useCallback(async () => {
    const success = await push.subscribe();
    if (!success && push.permission === 'denied') {
      toast({
        title: 'Notificações bloqueadas',
        description: 'Você pode ativar nas configurações do navegador a qualquer momento.',
      });
    }
    return success;
  }, [push]);

  /**
   * Dismiss the opt-in modal. If snooze=true, remind in 24h.
   */
  const dismissOptIn = useCallback((snooze = false) => {
    if (snooze) {
      const remindAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(OPT_IN_REMIND_KEY, String(remindAt));
    } else {
      localStorage.setItem(OPT_IN_DISMISSED_KEY, 'permanent');
    }
  }, []);

  /**
   * Send an in-app toast notification (fallback when push is unavailable).
   */
  const notifyInApp = useCallback((title: string, description: string) => {
    toast({ title, description });
  }, []);

  return {
    // Push state
    pushSupported: push.isSupported,
    pushSubscribed: push.isSubscribed,
    pushPermission: push.permission,
    pushLoading: push.isLoading,

    // Unread counts
    ...unread,

    // Actions
    requestPermission,
    unsubscribePush: push.unsubscribe,
    dismissOptIn,
    shouldShowOptIn,
    notifyInApp,
  };
}
