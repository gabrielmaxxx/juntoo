

## Diagnóstico de Performance

Identifiquei vários problemas graves de performance no app. Aqui está o que encontrei e o plano para resolver:

### Problemas Encontrados

**1. `useConversations` faz N+1 queries no Supabase (CRÍTICO)**
O hook `useDirectMessages.ts` é chamado no `AppHeader` (presente em TODAS as páginas). Ele faz um loop `for` com uma query individual para cada conversa (linhas 80-93) — buscando última mensagem + contagem de não lidas separadamente para CADA conversa. Com 10 conversas, são 20+ queries extras no carregamento de qualquer página.

**2. Excesso de canais Realtime simultâneos (CRÍTICO)**
O app abre ~13+ canais Supabase Realtime ao mesmo tempo:
- CacheManager: 8 canais (um por tabela) + 2 canais por usuário = 10
- AppHeader: 1 canal (notification-count)
- useEventUnreadCount: 1 canal (event-unread-count) 
- NotificationPanel: 1 canal (notifications-changes)
- useDirectMessages: 1 canal (dm-updates)

Isso sobrecarrega a conexão WebSocket e o processamento de eventos.

**3. Duplicação de listeners Realtime**
O CacheManager já escuta `notifications` e `event_messages`, mas `AppHeader`, `NotificationPanel`, e `useEventUnreadCount` criam canais adicionais para as mesmas tabelas — gerando invalidações e re-fetches redundantes.

**4. `useConversations` carrega em TODAS as páginas**
O `AppHeader` chama `useConversations()` que carrega TODAS as conversas com mensagens apenas para mostrar um badge de contagem. Isso deveria ser uma query leve (apenas contagem).

**5. `useFriendsEvents` faz 3 queries sequenciais**
Friendships → participations → events — 3 round-trips ao Supabase só para a home page.

---

### Plano de Otimização

**Etapa 1: Substituir N+1 queries no `useConversations` por query única**
- Criar uma query única que busca conversas com última mensagem e contagem de não-lidas de uma vez, em vez de um loop por conversa.
- Alternativa: criar um hook separado `useUnreadDMCount` que faz apenas `SELECT count(*)` para o badge do header.

**Etapa 2: Reduzir canais Realtime**
- Remover canais duplicados: o CacheManager já cobre `notifications` e `event_messages`. Remover os canais extras do `AppHeader`, `NotificationPanel` e `useEventUnreadCount`.
- Consolidar o CacheManager para usar menos canais (agrupar tabelas em 2-3 canais em vez de 8 separados).

**Etapa 3: Criar hook leve `useUnreadCounts` para o AppHeader**
- Em vez de `useConversations()` (que carrega tudo), criar um hook que faz apenas uma query de contagem para DMs não lidas e notificações, com invalidação via CacheManager.

**Etapa 4: Otimizar `useFriendsEvents` com RPC**
- Criar uma função SQL `get_friends_events(p_user_id, p_limit)` que faz os 3 JOINs em uma única query no banco, eliminando 3 round-trips.

**Etapa 5: Lazy-load do `useConversations` completo**
- Mover a carga completa de conversas para quando o usuário realmente acessa a aba de mensagens, não no header global.

### Resumo de Impacto Esperado

| Otimização | Queries eliminadas | Canais eliminados |
|---|---|---|
| Fix N+1 conversas | ~20 queries/page load | — |
| Consolidar Realtime | — | ~8 canais |
| Hook leve no header | ~5 queries/page load | — |
| RPC friends events | 2 queries/home load | — |

### Arquivos Afetados
- `src/hooks/useDirectMessages.ts` — refatorar para eliminar N+1
- `src/components/AppHeader.tsx` — usar hook leve
- `src/hooks/useEventUnreadCount.ts` — simplificar ou eliminar
- `src/lib/cacheManager.ts` — consolidar canais
- `src/components/NotificationPanel.tsx` — remover canal duplicado
- `src/hooks/useEvents.ts` — RPC para friends events
- Nova migration SQL — criar `get_friends_events` e `get_unread_counts`

