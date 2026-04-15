/**
 * Event Service — centraliza queries ao Supabase para descoberta de eventos.
 *
 * Todas as funções retornam dados brutos (rows da view events_with_details).
 * A transformação para o tipo Event é feita nos hooks que consomem este serviço.
 */

import { supabase } from '@/integrations/supabase/client';
import { EVENT_LIST_COLUMNS } from '@/lib/eventColumns';

// ─── Tipos de filtro ──────────────────────────────────────

export interface EventSearchFilters {
  text?: string;
  category?: string;
  state?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  priceRange?: 'all' | 'free' | 'paid';
  hasAvailability?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: 'date' | 'participants_count' | 'created_at';
  orderDirection?: 'asc' | 'desc';
}

export interface EventSearchResult {
  data: any[];
  count: number;
  hasMore: boolean;
}

// ─── Helpers ──────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

const applyBaseFilters = (query: any) => {
  return query
    .eq('is_private', false)
    .or(`date.gte.${today()},is_recurring.eq.true`);
};

// ─── Busca com todos os filtros ───────────────────────────

export async function searchEvents(
  filters: EventSearchFilters
): Promise<EventSearchResult> {
  const pageSize = filters.pageSize || 15;
  const page = filters.page || 0;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('events_with_details')
    .select(EVENT_LIST_COLUMNS, { count: 'exact' });

  query = applyBaseFilters(query);

  // Text search (ilike em título, descrição, local e categoria)
  if (filters.text) {
    const t = `%${filters.text}%`;
    query = query.or(
      `title.ilike.${t},description.ilike.${t},location.ilike.${t},category.ilike.${t}`
    );
  }

  if (filters.category && filters.category !== 'Todos') {
    query = query.eq('category', filters.category);
  }

  if (filters.state) query = query.eq('state', filters.state);
  if (filters.city) query = query.eq('city', filters.city);

  if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('date', filters.dateTo);

  if (filters.priceRange === 'free') {
    query = query.or('price.eq.0,price.is.null');
  } else if (filters.priceRange === 'paid') {
    query = query.gt('price', 0);
  }

  // Ordenação
  const orderBy = filters.orderBy || 'date';
  const ascending = (filters.orderDirection || 'asc') === 'asc';
  query = query.order(orderBy, { ascending }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    hasMore: (data?.length || 0) === pageSize,
  };
}

// ─── Feed: Para Você (baseado em interesses) ──────────────

export async function fetchForYouEvents(
  interests: string[],
  limit = 10
) {
  if (!interests.length) return [];

  // Build OR filter for categories matching interests
  const categoryFilter = interests.map((i) => `category.eq.${i}`).join(',');

  let query = supabase
    .from('events_with_details')
    .select(EVENT_LIST_COLUMNS)
    .eq('is_private', false)
    .gte('date', today())
    .or(categoryFilter)
    .order('date', { ascending: true })
    .limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─── Feed: Perto de Você ─────────────────────────────────

export async function fetchNearbyEvents(city: string, limit = 10) {
  const { data, error } = await supabase
    .from('events_with_details')
    .select(EVENT_LIST_COLUMNS)
    .eq('is_private', false)
    .gte('date', today())
    .ilike('city', `%${city}%`)
    .order('date', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ─── Feed: Populares Agora ───────────────────────────────

export async function fetchPopularEvents(limit = 10) {
  const { data, error } = await supabase
    .from('events_with_details')
    .select(EVENT_LIST_COLUMNS)
    .eq('is_private', false)
    .gte('date', today())
    .order('participants_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ─── Feed: Acontecendo Hoje ──────────────────────────────

export async function fetchTodayEvents(limit = 10) {
  const todayStr = today();
  const { data, error } = await supabase
    .from('events_with_details')
    .select(EVENT_LIST_COLUMNS)
    .eq('is_private', false)
    .eq('date', todayStr)
    .order('time', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
