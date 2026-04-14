/**
 * Cliente Supabase tipado — wrapper de conveniência.
 *
 * O cliente real vive em @/integrations/supabase/client.ts (gerado pelo Lovable).
 * Este módulo re-exporta o cliente e adiciona helpers de tipagem para uso
 * em services e hooks sem precisar importar de dois lugares.
 */

// Re-export do cliente principal (evita duplicação de instância)
export { supabase } from '@/integrations/supabase/client';

// Re-export dos tipos gerados para acesso rápido
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

/**
 * Tipos auxiliares de conveniência — use assim:
 *
 *   import type { EventRow, ProfileRow } from '@/lib/supabase';
 */
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// ── Row types (leitura) ──────────────────────────────────
export type EventRow = Tables<'events'>;
export type ProfileRow = Tables<'profiles'>;
export type EventParticipantRow = Tables<'event_participants'>;
export type EventReviewRow = Tables<'event_reviews'>;
export type UserReviewRow = Tables<'user_reviews'>;
export type NotificationRow = Tables<'notifications'>;
export type FriendshipRow = Tables<'friendships'>;
export type DirectMessageRow = Tables<'direct_messages'>;
export type ReportRow = Tables<'reports'>;
export type PinnedEventRow = Tables<'pinned_events'>;

// ── Insert types (criação) ───────────────────────────────
export type EventInsert = TablesInsert<'events'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type EventParticipantInsert = TablesInsert<'event_participants'>;
export type NotificationInsert = TablesInsert<'notifications'>;

// ── Update types (atualização parcial) ───────────────────
export type EventUpdate = TablesUpdate<'events'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;
