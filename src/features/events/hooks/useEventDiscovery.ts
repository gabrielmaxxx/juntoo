/**
 * Hooks para descoberta de eventos — alimentam EventFeed e SearchAndFilter.
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  searchEvents,
  fetchForYouEvents,
  fetchNearbyEvents,
  fetchPopularEvents,
  fetchTodayEvents,
  type EventSearchFilters,
} from '../services/eventService';
import { queryKeys } from '@/lib/queryKeys';
import type { Event } from '@/types';

// ─── Transform helper ────────────────────────────────────

const transform = (row: any): Event => ({
  id: row.id!,
  title: row.title || '',
  category: row.category || '',
  location: row.location || '',
  state: row.state || '',
  city: row.city || '',
  date: row.date || '',
  time: row.time || '',
  price: row.price?.toString() || 'Gratuito',
  description: row.description || '',
  imageUrl: row.image_url || '/placeholder.svg',
  participantsCount: row.participants_count || 0,
  createdBy: row.created_by || '',
  creatorName: row.creator_name || '',
  creatorAvatar: row.creator_avatar || '',
  isRecurring: row.is_recurring || false,
  averageRating: row.average_rating || undefined,
  reviewCount: row.review_count || 0,
  maxParticipants: row.max_participants || undefined,
  isPrivate: row.is_private || false,
});

// ─── Feed Hooks ──────────────────────────────────────────

export const useForYouEvents = (interests: string[], limit = 10) =>
  useQuery({
    queryKey: ['feed-for-you', interests, limit],
    queryFn: async () => (await fetchForYouEvents(interests, limit)).map(transform),
    enabled: interests.length > 0,
    staleTime: 60_000,
  });

export const useNearbyFeedEvents = (city: string | null, limit = 10) =>
  useQuery({
    queryKey: ['feed-nearby', city, limit],
    queryFn: async () => (await fetchNearbyEvents(city!, limit)).map(transform),
    enabled: !!city,
    staleTime: 60_000,
  });

export const usePopularEvents = (limit = 10) =>
  useQuery({
    queryKey: ['feed-popular', limit],
    queryFn: async () => (await fetchPopularEvents(limit)).map(transform),
    staleTime: 60_000,
  });

export const useTodayEvents = (limit = 10) =>
  useQuery({
    queryKey: ['feed-today', limit],
    queryFn: async () => (await fetchTodayEvents(limit)).map(transform),
    staleTime: 60_000,
  });

// ─── Infinite Search ─────────────────────────────────────

export const useSearchEvents = (filters: Omit<EventSearchFilters, 'page'>) =>
  useInfiniteQuery({
    queryKey: ['search-events', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await searchEvents({ ...filters, page: pageParam });
      return {
        events: result.data.map(transform),
        nextPage: result.hasMore ? pageParam + 1 : undefined,
        totalCount: result.count,
      };
    },
    getNextPageParam: (last) => last.nextPage,
    initialPageParam: 0,
    staleTime: 60_000,
  });
