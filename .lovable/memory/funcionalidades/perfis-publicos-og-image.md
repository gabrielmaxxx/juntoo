---
name: Perfis Públicos & OG Image
description: Perfis públicos compartilháveis em /u/:handle (username ou UUID) com OG image dinâmica gerada via Edge Function (Satori + resvg-wasm)
type: feature
---

# Perfis Públicos Compartilháveis

## Resumo
Sistema de perfis públicos acessíveis sem login, com URLs amigáveis e Open Graph dinâmico para compartilhamento em redes sociais.

## Roteamento
- **`/u/:handle`** — `handle` resolve como `username` (case-insensitive) ou `userId` UUID
- Renderizada por `src/pages/PublicProfile.tsx` (lazy-loaded em `App.tsx`)
- `HelmetProvider` (react-helmet-async) envolve o app para gerenciar `<head>` por rota

## Banco de Dados
- **Coluna `profiles.username`** — TEXT, UNIQUE, opcional
- **Constraint `username_format`** — `^[a-z0-9_]{3,30}$` (regex Postgres `~`)
- **Index parcial** `idx_profiles_username` (apenas WHERE NOT NULL)
- **RLS adicional** — política "Public profiles are viewable by anyone" (role `anon`) usando `is_profile_public(user_id)` para preservar a privacidade configurada
- **RPCs `SECURITY DEFINER` GRANTeadas a `anon`**:
  - `get_public_profile_by_username(p_username TEXT)` — busca por username (lowercase)
  - `get_public_profile_by_id(p_user_id UUID)` — fallback por UUID
- Ambas retornam JSON consolidado: profile + reputation (via `calculate_reputation_score`) + achievements + últimos 6 eventos públicos criados (window: -30 dias). Retornam `{ private: true, full_name }` quando `is_profile_public` é falso.

## Hook
- `src/features/profile/hooks/usePublicProfile.ts` — `usePublicProfile(handle)` detecta UUID via regex e roteia para a RPC apropriada. `staleTime: 5min`.

## OG Image Edge Function
- **Path**: `supabase/functions/og-image/index.ts`
- **Endpoint**: `GET /functions/v1/og-image?username=xxx` ou `?userId=<uuid>`
- **Stack**: Satori (JSX → SVG) + `@resvg/resvg-wasm` (SVG → PNG) + `yoga-wasm-web`
- **Fonte**: Inter (carregada dinamicamente do GitHub Google Fonts, cacheada em memória após o primeiro hit)
- **Saída**: PNG 1200x630, `Cache-Control: public, max-age=3600, s-maxage=3600`
- **Layout**: gradient teal→coral, avatar circular ou iniciais, nome, cidade, badge de nível de reputação, contagem de eventos, top 3 interesses
- **Reutiliza** os mesmos níveis de reputação definidos em `src/hooks/useReputationScore.ts` (mas reimplementados localmente para isolamento)

## Meta Tags & SEO
- `<title>`: `[Nome] no Juntoo — [cidade]`
- Open Graph: `og:title`, `og:description`, `og:image` (URL da Edge Function), `og:image:width=1200`, `og:image:height=630`, `og:type=profile`
- Twitter: `twitter:card=summary_large_image`
- JSON-LD `Person` para SEO estruturado
- `<link rel="canonical">` apontando para a URL pública do perfil

## Username UI
- `src/components/settings/UsernameSettings.tsx` integrado em `AccountSettings`
- Validação live (debounced 400ms) consultando disponibilidade
- Sanitização de input em tempo real (lowercase + remove caracteres inválidos)
- Preview da URL pública com botões copiar/abrir

## CTAs Convidado
- Quando o visitante não está autenticado: card destacado oferecendo cadastro grátis
- Botões "Conectar" e "Convidar para evento" redirecionam para `/auth` se não logado, ou para o fluxo correspondente se logado
- Usuário visualizando o próprio perfil não vê CTAs de ação (próprio perfil)

## Privacidade
- Respeita totalmente `privacy_preferences.show_profile_public` via `is_profile_public()`
- Perfis privados retornam apenas o nome + ícone de cadeado
- A RLS garante que a coluna `username` seja visível apenas se o perfil já for público para o solicitante
