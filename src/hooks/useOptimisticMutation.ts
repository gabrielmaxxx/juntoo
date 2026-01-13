import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OptimisticMutationOptions<TData, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: QueryKey;
  optimisticUpdate?: (old: TData | undefined, variables: TVariables) => TData;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
  successMessage?: string;
  errorMessage?: string;
  invalidateOnSuccess?: QueryKey[];
}

/**
 * Hook for optimistic mutations with automatic cache updates and rollback.
 * Provides a smoother UX by updating the UI immediately before the server responds.
 */
export function useOptimisticMutation<TData, TVariables, TContext = { previousData: TData | undefined }>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  onSuccess,
  onError,
  successMessage,
  errorMessage = 'Ocorreu um erro. Tente novamente.',
  invalidateOnSuccess,
}: OptimisticMutationOptions<TData, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update the cache
      if (optimisticUpdate && previousData !== undefined) {
        queryClient.setQueryData<TData>(queryKey, (old) => 
          optimisticUpdate(old, variables)
        );
      }

      // Return context with the previous data for rollback
      return { previousData } as TContext;
    },

    onError: (error, variables, context) => {
      // Rollback to the previous value on error
      if (context && (context as any).previousData !== undefined) {
        queryClient.setQueryData(queryKey, (context as any).previousData);
      }
      
      toast.error(errorMessage);
      onError?.(error as Error, variables, context);
    },

    onSuccess: (data, variables) => {
      if (successMessage) {
        toast.success(successMessage);
      }
      
      // Invalidate related queries
      invalidateOnSuccess?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      onSuccess?.(data, variables);
    },

    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Pre-built optimistic mutations for common operations

interface TogglePinVariables {
  eventId: string;
  isPinned: boolean;
}

export const useOptimisticTogglePin = (userId: string) => {
  const queryClient = useQueryClient();
  
  return useOptimisticMutation<string[], TogglePinVariables>({
    mutationFn: async ({ eventId, isPinned }) => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      if (isPinned) {
        await supabase
          .from('pinned_events')
          .delete()
          .eq('user_id', userId)
          .eq('event_id', eventId);
      } else {
        await supabase
          .from('pinned_events')
          .insert({ user_id: userId, event_id: eventId });
      }
      
      // Return updated pinned event IDs
      const { data } = await supabase
        .from('pinned_events')
        .select('event_id')
        .eq('user_id', userId);
      
      return data?.map(p => p.event_id) || [];
    },
    queryKey: ['pinned-events', userId],
    optimisticUpdate: (old, { eventId, isPinned }) => {
      if (!old) return isPinned ? [] : [eventId];
      return isPinned 
        ? old.filter(id => id !== eventId)
        : [...old, eventId];
    },
    successMessage: undefined, // Silent update
  });
};

interface JoinEventVariables {
  eventId: string;
  userId: string;
}

export const useOptimisticJoinEvent = () => {
  return useOptimisticMutation<void, JoinEventVariables>({
    mutationFn: async ({ eventId, userId }) => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { error } = await supabase
        .from('event_participants')
        .insert({ event_id: eventId, user_id: userId });
      
      if (error) throw error;
    },
    queryKey: ['event-participation'],
    successMessage: 'Você entrou no evento!',
    errorMessage: 'Não foi possível entrar no evento.',
  });
};

interface LeaveEventVariables {
  eventId: string;
  userId: string;
}

export const useOptimisticLeaveEvent = () => {
  return useOptimisticMutation<void, LeaveEventVariables>({
    mutationFn: async ({ eventId, userId }) => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    queryKey: ['event-participation'],
    successMessage: 'Você saiu do evento.',
    errorMessage: 'Não foi possível sair do evento.',
  });
};
