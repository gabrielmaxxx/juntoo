/**
 * @deprecated Use useUnreadCounts instead.
 * This hook is kept for backward compatibility but now delegates to useUnreadCounts.
 */
import { useUnreadCounts } from './useUnreadCounts';

export function useEventUnreadCount() {
  const { eventUnread } = useUnreadCounts();
  return { totalUnread: eventUnread };
}
