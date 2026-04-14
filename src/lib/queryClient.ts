/**
 * Configuração centralizada do React Query para o Juntoo.
 *
 * Otimizações para app social:
 * - staleTime curto (1 min) para manter dados de eventos frescos
 * - gcTime moderado (5 min) para não desperdiçar memória mobile
 * - Retry com backoff exponencial (2x) para lidar com conexões instáveis
 * - Erro global via toast para feedback consistente
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Mensagens de erro amigáveis por código HTTP.
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Supabase errors
    if (error.message.includes('JWT')) return 'Sessão expirada. Faça login novamente.';
    if (error.message.includes('permission')) return 'Sem permissão para esta ação.';
    if (error.message.includes('network') || error.message.includes('fetch'))
      return 'Sem conexão. Verifique sua internet.';
    return error.message;
  }
  return 'Ocorreu um erro inesperado.';
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Só mostra toast para queries que já tinham dados (refetch falhou)
      // Evita spam de toasts no carregamento inicial
      if (query.state.data !== undefined) {
        toast.error('Erro ao atualizar dados', {
          description: getErrorMessage(error),
        });
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error('Erro ao salvar', {
        description: getErrorMessage(error),
      });
    },
  }),
  defaultOptions: {
    queries: {
      // Dados ficam "frescos" por 1 minuto — ideal para feeds sociais
      staleTime: 1000 * 60,
      // Garbage collection após 5 minutos sem uso
      gcTime: 1000 * 60 * 5,
      // Retry com backoff: 1s, 2s (max 2 tentativas)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Não refetch ao focar janela (evita requests desnecessários em mobile)
      refetchOnWindowFocus: false,
      // Não refetch ao reconectar (o realtime cuida disso)
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});
