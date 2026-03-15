import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from './queryKeys';
import { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'events' | 'event_participants' | 'event_messages' | 'event_reviews' | 
                 'profiles' | 'friendships' | 'notifications' | 'pinned_events' |
                 'direct_messages';

class CacheManager {
  private queryClient: QueryClient | null = null;
  private channels: RealtimeChannel[] = [];
  private isSubscribed = false;
  private userId: string | null = null;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  initialize(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
    if (this.isSubscribed) {
      this.unsubscribe();
      if (userId) {
        this.subscribe();
      }
    }
  }

  subscribe() {
    if (this.isSubscribed || !this.queryClient) return;

    // Channel 1: Content tables (events, participants, reviews, profiles)
    const contentChannel = supabase
      .channel('cache-content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' },
        (payload) => this.handleChange('events', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' },
        (payload) => this.handleChange('event_participants', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_reviews' },
        (payload) => this.handleChange('event_reviews', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },
        (payload) => this.handleChange('profiles', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' },
        (payload) => this.handleChange('friendships', payload))
      .subscribe();

    this.channels.push(contentChannel);

    // Channel 2: Messaging tables (DMs, event messages) + notifications
    const messagingChannel = supabase
      .channel('cache-messaging')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_messages' },
        (payload) => this.handleChange('event_messages', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' },
        (payload) => this.handleChange('direct_messages', payload))
      .subscribe();

    this.channels.push(messagingChannel);

    // Channel 3: User-specific (notifications, pinned)
    if (this.userId) {
      const userChannel = supabase
        .channel(`cache-user-${this.userId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${this.userId}`,
        }, (payload) => this.handleChange('notifications', payload))
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'pinned_events',
          filter: `user_id=eq.${this.userId}`,
        }, (payload) => this.handleChange('pinned_events', payload))
        .subscribe();

      this.channels.push(userChannel);
    }

    this.isSubscribed = true;
  }

  private debouncedInvalidate(key: string, fn: () => void, delay = 1000) {
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    this.debounceTimers.set(key, setTimeout(() => {
      fn();
      this.debounceTimers.delete(key);
    }, delay));
  }

  private handleChange(table: TableName, payload: any) {
    if (!this.queryClient) return;

    const { new: newRecord, old: oldRecord } = payload;
    const record = newRecord || oldRecord;

    switch (table) {
      case 'events':
        this.debouncedInvalidate('events', () => {
          this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.all });
          if (record?.id) {
            this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.detail(record.id) });
          }
          if (record?.created_by) {
            this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.userCreated(record.created_by) });
          }
        });
        break;

      case 'event_participants':
        this.debouncedInvalidate('participants', () => {
          this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.all });
          if (record?.event_id) {
            this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.detail(record.event_id) });
          }
          if (record?.user_id) {
            this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.userRegistered(record.user_id) });
          }
        });
        break;

      case 'event_messages':
        if (record?.event_id) {
          this.queryClient.invalidateQueries({ queryKey: ['event-messages', record.event_id] });
        }
        // Refresh unread counts
        this.debouncedInvalidate('unread-counts', () => {
          this.queryClient?.invalidateQueries({ queryKey: ['unread-counts'] });
        }, 2000);
        break;

      case 'direct_messages':
        // Refresh unread counts
        this.debouncedInvalidate('unread-counts', () => {
          this.queryClient?.invalidateQueries({ queryKey: ['unread-counts'] });
        }, 2000);
        break;

      case 'event_reviews':
        this.debouncedInvalidate('reviews', () => {
          this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.all });
          if (record?.event_id) {
            this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.detail(record.event_id) });
          }
        });
        break;

      case 'profiles':
        if (record?.user_id) {
          this.queryClient.invalidateQueries({ queryKey: queryKeys.profiles.byUserId(record.user_id) });
        }
        break;

      case 'friendships':
        this.debouncedInvalidate('friendships', () => {
          this.queryClient?.invalidateQueries({ queryKey: queryKeys.friendships.all });
          this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.all });
          if (record?.user_id) {
            this.queryClient?.invalidateQueries({ queryKey: queryKeys.friendships.byUser(record.user_id) });
          }
          if (record?.friend_id) {
            this.queryClient?.invalidateQueries({ queryKey: queryKeys.friendships.byUser(record.friend_id) });
          }
        });
        break;

      case 'notifications':
        this.debouncedInvalidate('unread-counts', () => {
          this.queryClient?.invalidateQueries({ queryKey: ['unread-counts'] });
        }, 1000);
        this.queryClient.invalidateQueries({ queryKey: ['notifications'] });
        break;

      case 'pinned_events':
        this.queryClient.invalidateQueries({ queryKey: ['pinned-events'] });
        break;
    }
  }

  unsubscribe() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.channels = [];
    this.isSubscribed = false;
  }

  // Manual cache invalidation methods
  invalidateEvents() {
    this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.all });
  }

  invalidateEvent(eventId: string) {
    this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
  }

  invalidateUserEvents(userId: string) {
    this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.user(userId) });
    this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.userCreated(userId) });
    this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.userRegistered(userId) });
  }

  invalidateProfile(userId: string) {
    this.queryClient?.invalidateQueries({ queryKey: queryKeys.profiles.byUserId(userId) });
  }

  invalidateFriendships(userId: string) {
    this.queryClient?.invalidateQueries({ queryKey: queryKeys.friendships.byUser(userId) });
    this.queryClient?.invalidateQueries({ queryKey: queryKeys.events.friends(userId) });
  }

  // Prefetch commonly accessed data
  async prefetchHomeData(userId?: string, interests?: string[] | null) {
    if (!this.queryClient) return;

    this.queryClient.prefetchQuery({
      queryKey: queryKeys.events.trending(),
      staleTime: 5 * 60 * 1000,
    });

    if (userId) {
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.events.recommended(userId),
        staleTime: 5 * 60 * 1000,
      });
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.events.friends(userId),
        staleTime: 5 * 60 * 1000,
      });
    }
  }

  // Optimistic update helpers
  setQueryData<T>(queryKey: readonly unknown[], updater: (old: T | undefined) => T) {
    this.queryClient?.setQueryData(queryKey, updater);
  }

  getQueryData<T>(queryKey: readonly unknown[]): T | undefined {
    return this.queryClient?.getQueryData(queryKey);
  }
}

// Singleton instance
export const cacheManager = new CacheManager();
