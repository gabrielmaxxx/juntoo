/**
 * Hook base para queries tipadas ao Supabase via React Query.
 *
 * Encapsula padrões comuns: loading, error, refetch, cache.
 * Uso:
 *   const { data } = useSupabaseQuery(['events'], (sb) =>
 *     sb.from('events').select('*').eq('is_private', false)
 *   );
 */

import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type TypedClient = SupabaseClient<Database>;

/**
 * Query tipada genérica — passa o cliente Supabase tipado para o builder.
 * O resultado é inferido automaticamente a partir do retorno do queryFn.
 */
export function useSupabaseQuery<T>(
  queryKey: QueryKey,
  queryFn: (client: TypedClient) => PromiseLike<{ data: T | null; error: any }>,
  options?: { enabled?: boolean; staleTime?: number; gcTime?: number }
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn(supabase);
      if (error) throw error;
      return data as T;
    },
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: options?.gcTime ?? 10 * 60 * 1000,
  });
}

/**
 * Mutation tipada genérica com invalidação automática de queries.
 */
export function useSupabaseMutation<TVariables, TData = unknown>(
  mutationFn: (client: TypedClient, variables: TVariables) => PromiseLike<{ data: TData | null; error: any }>,
  options?: { invalidateKeys?: QueryKey[]; onSuccess?: (data: TData) => void }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const { data, error } = await mutationFn(supabase, variables);
      if (error) throw error;
      return data as TData;
    },
    onSuccess: (data) => {
      // Invalida caches relacionados após sucesso
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options?.onSuccess?.(data);
    },
  });
}
