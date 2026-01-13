import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from './queryKeys';
import { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'events' | 'event_participants' | 'event_messages' | 'event_reviews' | 
                 'profiles' | 'friendships' | 'notifications' | 'pinned_events';

interface CacheConfig {
  table: TableName;
  invalidateKeys: readonly (readonly string[])[];
  filter?: (payload: any) => boolean;
}

// Map tables to their cache invalidation rules
const cacheInvalidationRules: CacheConfig[] = [
  {
    table: 'events',
    invalidateKeys: [
      queryKeys.events.all,
      queryKeys.events.trending(),
    ],
  },
  {
    table: 'event_participants',
    invalidateKeys: [
      queryKeys.events.all,
    ],
  },
  {
    table: 'event_messages',
    invalidateKeys: [], // Handled separately with specific event ID
  },
  {
    table: 'event_reviews',
    invalidateKeys: [
      queryKeys.events.all,
    ],
  },
  {
    table: 'profiles',
    invalidateKeys: [
      queryKeys.profiles.all,
    ],
  },
  {
    table: 'friendships',
    invalidateKeys: [
      queryKeys.friendships.all,
      queryKeys.events.all, // Friends events need refresh
    ],
  },
  {
    table: 'notifications',
    invalidateKeys: [], // Notifications are user-specific
  },
  {
    table: 'pinned_events',
    invalidateKeys: [], // Handled by specific user
  },
];

class CacheManager {
  private queryClient: QueryClient | null = null;
  private channels: RealtimeChannel[] = [];
  private isSubscribed = false;
  private userId: string | null = null;

  initialize(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
    
    // Re-subscribe with new user context
    if (this.isSubscribed) {
      this.unsubscribe();
      if (userId) {
        this.subscribe();
      }
    }
  }

  subscribe() {
    if (this.isSubscribed || !this.queryClient) return;

    console.log('[CacheManager] Subscribing to realtime updates');

    // Subscribe to each table
    cacheInvalidationRules.forEach((config) => {
      const channel = supabase
        .channel(`cache-${config.table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: config.table,
          },
          (payload) => this.handleChange(config, payload)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[CacheManager] Subscribed to ${config.table}`);
          }
        });

      this.channels.push(channel);
    });

    // Subscribe to user-specific tables
    if (this.userId) {
      this.subscribeToUserSpecificTables();
    }

    this.isSubscribed = true;
  }

  private subscribeToUserSpecificTables() {
    if (!this.userId) return;

    // Notifications channel
    const notificationsChannel = supabase
      .channel(`cache-notifications-${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.userId}`,
        },
        () => {
          console.log('[CacheManager] User notifications updated');
          this.queryClient?.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    this.channels.push(notificationsChannel);

    // Pinned events channel
    const pinnedChannel = supabase
      .channel(`cache-pinned-${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_events',
          filter: `user_id=eq.${this.userId}`,
        },
        () => {
          console.log('[CacheManager] User pinned events updated');
          this.queryClient?.invalidateQueries({ queryKey: ['pinned-events'] });
        }
      )
      .subscribe();

    this.channels.push(pinnedChannel);
  }

  private handleChange(config: CacheConfig, payload: any) {
    if (!this.queryClient) return;

    // Apply filter if defined
    if (config.filter && !config.filter(payload)) return;

    console.log(`[CacheManager] ${config.table} changed:`, payload.eventType);

    // Invalidate configured keys
    config.invalidateKeys.forEach((key) => {
      this.queryClient?.invalidateQueries({ queryKey: [...key] });
    });

    // Handle specific cases
    this.handleSpecificInvalidations(config.table, payload);
  }

  private handleSpecificInvalidations(table: TableName, payload: any) {
    if (!this.queryClient) return;

    const { new: newRecord, old: oldRecord, eventType } = payload;
    const record = newRecord || oldRecord;

    switch (table) {
      case 'events':
        // Invalidate specific event detail
        if (record?.id) {
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.events.detail(record.id) 
          });
        }
        // Invalidate user's events if they created it
        if (record?.created_by) {
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.events.userCreated(record.created_by) 
          });
        }
        break;

      case 'event_participants':
        // Invalidate specific event
        if (record?.event_id) {
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.events.detail(record.event_id) 
          });
        }
        // Invalidate user's registered events
        if (record?.user_id) {
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.events.userRegistered(record.user_id) 
          });
        }
        break;

      case 'event_messages':
        // Invalidate event chat messages
        if (record?.event_id) {
          this.queryClient.invalidateQueries({ 
            queryKey: ['event-messages', record.event_id] 
          });
        }
        break;

      case 'event_reviews':
        // Invalidate specific event to refresh ratings
        if (record?.event_id) {
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.events.detail(record.event_id) 
          });
        }
        break;

      case 'friendships':
        // Invalidate both users' friend lists
        if (record?.user_id) {
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.friendships.byUser(record.user_id) 
          });
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.events.friends(record.user_id) 
          });
        }
        if (record?.friend_id) {
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.friendships.byUser(record.friend_id) 
          });
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.events.friends(record.friend_id) 
          });
        }
        break;

      case 'profiles':
        // Invalidate specific profile
        if (record?.user_id) {
          this.queryClient.invalidateQueries({ 
            queryKey: queryKeys.profiles.byUserId(record.user_id) 
          });
        }
        break;
    }
  }

  unsubscribe() {
    console.log('[CacheManager] Unsubscribing from realtime updates');
    
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    
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

    // Prefetch trending events
    this.queryClient.prefetchQuery({
      queryKey: queryKeys.events.trending(),
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch recommended events if user is logged in
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
