

## Mover "Recomendado para você" da Home para a aba Busca

Faz bastante sentido! A seção de recomendações combina naturalmente com a página de busca -- o usuário está ali justamente para descobrir eventos. Isso também deixa a Home mais enxuta e focada.

### Alterações

**1. `src/components/HomePage.tsx`**
- Remover a seção "Recomendado para você" inteira (imports de `useRecommendedEvents`, `Sparkles`, e todo o bloco JSX da seção).
- Remover `useRecommendedEvents` do hook e `loadingRecommended` do estado de loading.

**2. `src/components/SearchPage.tsx`**
- Importar `useRecommendedEvents` de `@/hooks/useEvents` e `useAuth` de `@/hooks/useAuth`.
- Importar `Sparkles` do lucide-react e `LazyImage` de `@/components/ui/lazy-image`.
- Buscar `user` e `profile` via `useAuth()`, e chamar `useRecommendedEvents(user?.id, profile?.interests, 10)`.
- Exibir a seção "Recomendado para você" **antes** dos resultados de busca, visível apenas quando o usuário **não tem filtros ativos** (sem texto digitado e filtros padrão). Assim, ao começar a buscar, a seção some e os resultados tomam o lugar.
- Reutilizar o mesmo layout visual (cards com thumbnail, título, local, horário e `ChevronRight`).

