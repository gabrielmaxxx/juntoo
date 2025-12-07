export const queryKeys = {
  events: {
    all: ['events'] as const,
    public: () => [...queryKeys.events.all, 'public'] as const,
    publicWithDetails: () => [...queryKeys.events.all, 'public', 'with-details'] as const,
    user: (userId: string) => [...queryKeys.events.all, 'user', userId] as const,
    userRegistered: (userId: string) => [...queryKeys.events.all, 'user', userId, 'registered'] as const,
    userCreated: (userId: string) => [...queryKeys.events.all, 'user', userId, 'created'] as const,
    detail: (eventId: string) => [...queryKeys.events.all, eventId] as const,
    trending: () => [...queryKeys.events.all, 'trending'] as const,
    friends: (userId: string) => [...queryKeys.events.all, 'friends', userId] as const,
    recommended: (userId: string) => [...queryKeys.events.all, 'recommended', userId] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    byUserId: (userId: string) => [...queryKeys.profiles.all, userId] as const,
  },
  friendships: {
    all: ['friendships'] as const,
    byUser: (userId: string) => [...queryKeys.friendships.all, userId] as const,
  },
} as const;
