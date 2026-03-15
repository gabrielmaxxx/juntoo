

## Diagnóstico Adicional de Performance

Após a otimização anterior, identifiquei mais 6 problemas que ainda causam lentidão significativa:

### Problemas Encontrados

**1. Splash Screen bloqueia por 2 segundos fixos (ALTO IMPACTO)**
O `SplashScreen.tsx` força um `setTimeout` de 2000ms antes de mostrar qualquer conteúdo. Isso é tempo morto — o app já carregou mas fica parado.

**2. Canais Realtime duplicados ainda ativos**
- `useEventConversations.ts` abre canal `event-messages-inbox` (duplica CacheManager)
- `useEventDetails.tsx` abre canal `event-{id}-messages` por evento aberto
- `useDirectMessages.ts` (chat) abre canal `chat-{conversationId}` por conversa

**3. `useProfileData` faz 3 waterfalls sequenciais sem React Query**
Usa `useState`/`useEffect` raw em vez de React Query, sem cache. Busca: user_number → events → friends — tudo sequencial, tudo sem cache.

**4. `attendees: Array(participants_count).fill('participant')` cria arrays gigantes**
Em `transformEvent`, o código cria um array de N elementos apenas para usar `.length` na UI. Com 500 participantes, são 500 strings alocadas por evento.

**5. Splash Screen pode ser reduzido ou eliminado**
Após o primeiro acesso, mostrar splash de 2s a cada reload é frustrante.

**6. `useEventDetails` faz 5 queries sequenciais ao abrir um evento**
`checkParticipation` → `fetchParticipants` → `fetchCreator` → `fetchReviews` → `fetchMessages` — todas sequenciais, sem cache.

---

### Plano de Otimização (Fase 2)

**Etapa 1: Eliminar Splash Screen de 2s**
- Reduzir para 500ms ou usar `sessionStorage` para pular splash após primeiro acesso na sessão.

**Etapa 2: Remover canal Realtime de `useEventConversations`**
- O CacheManager já escuta `event_messages`. Remover o canal `event-messages-inbox` e usar invalidação via query key.

**Etapa 3: Substituir arrays de attendees por contagem numérica**
- Mudar `attendees: Array(N).fill('participant')` para `participantsCount: N` no tipo `Event` e atualizar a UI para usar o número diretamente.

**Etapa 4: Paralelizar queries do `useEventDetails`**
- Executar `checkParticipation`, `fetchParticipants`, `fetchCreator`, `fetchReviews` em `Promise.all` em vez de sequencialmente.

**Etapa 5: Migrar `useProfileData` para React Query**
- Substituir `useState`/`useEffect` por `useQuery` para aproveitar cache existente e evitar re-fetches.

### Impacto Esperado

| Otimização | Ganho |
|---|---|
| Splash 2s → 0.5s/skip | -1.5s tempo percebido |
| Remover canal duplicado | -1 canal Realtime |
| Array → número | Menos alocações de memória |
| Promise.all no EventDetails | -2s ao abrir evento |
| ProfileData com cache | Navegação instantânea no perfil |

### Arquivos Afetados
- `src/components/SplashScreen.tsx`
- `src/hooks/useEventConversations.ts`
- `src/hooks/useEventDetails.tsx`
- `src/hooks/useEvents.ts` + `src/hooks/useUserEvents.ts` (transformEvent)
- `src/types/index.ts` (tipo Event)
- `src/components/EventCard.tsx` e outros que usam `event.attendees.length`
- `src/hooks/useProfileData.ts`

