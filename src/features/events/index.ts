// Feature: Events — barrel export

// Hooks
export { useEventById, useInfiniteEventsFeed, useCreateEvent, useJoinEvent, useLeaveEvent } from './hooks/useEvents';
export { useEventRealtime, useNotificationsRealtime } from './hooks/useEventRealtime';
export {
  useForYouEvents,
  useNearbyFeedEvents,
  usePopularEvents,
  useTodayEvents,
  useSearchEvents,
} from './hooks/useEventDiscovery';

// Components
export { EventFeed } from './components/EventFeed';
export { SearchAndFilter } from './components/SearchAndFilter';
export { EventMap } from './components/EventMap';

// Services
export { searchEvents } from './services/eventService';
