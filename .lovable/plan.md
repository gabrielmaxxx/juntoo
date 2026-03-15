

## Otimizações para Lançamento — Fase 3

Analisei o estado atual do app após as duas rodadas de otimização. Aqui estão os problemas restantes e o que priorizar para um lançamento estável e rápido.

### Problemas Identificados

**1. `municipios-completo.json` no bundle principal (ALTO IMPACTO)**
O arquivo JSON com todos os municípios do Brasil é importado estaticamente em `brazilStatesAndCities.ts` e usado em 6 componentes (AuthPage, SearchPage, CreateEvent, ProfileEdit, etc.). Esse arquivo provavelmente tem centenas de KB e é carregado no bundle inicial mesmo que o usuário nunca abra um filtro por cidade. Isso aumenta o tempo de parse e o tamanho do download.

**2. `useEventDetails` ainda abre canal Realtime por evento (MÉDIO)**
Linha 472: `supabase.channel('event-${event.id}-messages')` cria um canal dedicado para cada evento aberto. Isso é aceitável para o chat ao vivo, mas o `fetchMessages()` na linha 483 re-busca TODAS as mensagens a cada INSERT em vez de apenas adicionar a nova. Com um chat ativo, isso gera muitas queries.

**3. `useOfflineStorage` salva com keys erradas (BAIXO)**
As OFFLINE_KEYS são `['events', 'trending-events', 'recommended-events']`, mas as query keys reais são `['events', 'trending']`, `['events', 'recommended', userId]`, etc. O IndexedDB nunca encontra match — o offline storage não funciona.

**4. Splash screen ainda renderiza no Index (BAIXO)**
A splash agora é rápida (500ms/skip), mas ela bloqueia a renderização do layout inteiro via `if (showSplash) return <SplashScreen>` na linha 166 do Index.tsx. Isso atrasa o início dos fetches de dados.

---

### Plano de Otimização

**Etapa 1: Lazy-load do JSON de municípios**
- Converter `brazilStatesAndCities.ts` para exportar funções async que fazem `import()` dinâmico do JSON apenas quando necessário (quando o usuário abre um filtro de cidade).
- Alternativa mais simples: mover o JSON para `public/` e fazer `fetch()` sob demanda, cacheando em memória.
- Isso reduz o bundle inicial significativamente.

**Etapa 2: Otimizar chat no `useEventDetails`**
- No handler do Realtime INSERT (linha 482), em vez de chamar `fetchMessages()` (que re-busca tudo), usar o payload do evento Realtime para adicionar a nova mensagem diretamente ao state.
- Isso elimina uma query a cada mensagem recebida.

**Etapa 3: Corrigir `useOfflineStorage` keys**
- Atualizar OFFLINE_KEYS para usar as keys reais do React Query: `queryKeys.events.trending()`, etc.
- Isso faz o cache offline funcionar de verdade para o lançamento.

**Etapa 4: Iniciar fetches durante splash**
- Em vez de bloquear com `if (showSplash) return <SplashScreen>`, renderizar o layout completo com a splash como overlay. Assim os hooks já começam a buscar dados enquanto a splash aparece.

### Impacto Esperado

| Otimização | Ganho |
|---|---|
| Lazy JSON municípios | Bundle menor, ~200-500KB a menos no carregamento |
| Chat incremental | -1 query por mensagem recebida |
| Offline storage fix | App funciona offline para dados críticos |
| Splash como overlay | Fetches iniciam ~500ms antes |

### Arquivos Afetados
- `src/data/brazilStatesAndCities.ts` — lazy import
- `src/hooks/useEventDetails.tsx` — chat incremental
- `src/hooks/useOfflineStorage.ts` — corrigir keys
- `src/pages/Index.tsx` — splash overlay
- Componentes que usam `BRAZIL_STATES_AND_CITIES` (6 arquivos) — adaptar para async

