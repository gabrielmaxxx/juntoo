# Memory: index.md
Updated: now

# Project Memory

## Core
- **Design:** Mobile-first, dvh units, 4px scale. Teal (primary), Coral (accent), warm neutrals. Poppins (headings), DM Sans (body).
- **Architecture:** React Query (1m cache) for server data. Zustand (`uiStore.ts`) for ephemeral UI state.
- **Navigation:** Deep-linkable via query params (e.g., `?tab=profile`). Always provide intuitive return nav for modals.
- **Database/Security:** Strict RLS. Use `SECURITY DEFINER` functions to resolve infinite recursion. Passwords min 8 chars (upper/lower/num).
- **Performance:** Preempt N+1 via explicit columns and batch queries. Pagination/Search uses server `.ilike()` (no client-side filtering).
- **Realtime:** Must cleanup Supabase subscriptions in effect returns. Delay initial subscriptions by 2s to prioritize rendering.
- **Assets:** AI-generated images upload to Supabase 'avatars', store public URL (never Base64). 
- **UX:** Skeletons > spinners. Use `EmptyState` and `SuccessFeedback`. Hide fixed bottom actions on mobile when chat is active.
- **PWA:** Network First for pages, Cache First for statics. Exclude Auth/API from Service Worker cache.

## Memories
- [Mobile First Strategy](mem://visao-projeto/mobile-first) — Layout stability, dynamic viewports, and hidden overflow guidelines
- [Visual System & Tokens](mem://design/sistema-visual-e-tokens) — Color palette, typography, large radiuses, and .juntoo-gradient
- [Visual Identity](mem://visao-projeto/identidade-visual) — Asset mapping: text logo in header, splash icon in loaders
- [UX Feedback Visuals](mem://interface/ux-feedback-visual) — Framer Motion micro-interactions, Skeletons, and animated empty states
- [Navigation & Layout](mem://interface/navegacao-e-layout) — Fixed bottom bar synced with URL params and compact AppHeader
- [Event Chat UX](mem://interface/event-details-chat-ux) — Hiding fixed action buttons in mobile event details when chat is focused
- [Deep Linking & Routing](mem://interface/roteamento-deep-linking) — Query string schemas for tabs and direct event/chat routing
- [State Management](mem://tecnico/gerenciamento-estado-zustand-query) — React Query vs Zustand boundaries for server/UI state
- [Performance Optimization](mem://tecnico/performance-cache-realtime) — Vendor splitting, explicit column selection, delayed realtime init
- [Realtime Stability](mem://tecnico/estabilidade-realtime-e-mensagens) — Temp ID deduplication and mandatory effect cleanup for channel subscriptions
- [Search & Trending Architecture](mem://tecnico/arquitetura-busca-e-trending) — Server-side .ilike filtering and trending by participants_count
- [Offline IndexedDB](mem://tecnico/dados-offline-indexeddb) — 24h TTL cache for home-data (trending/nearby) via IndexedDB
- [Capacitor Mobile](mem://funcionalidades/mobile-native-capacitor) — app.juntoo.mobile config and Vite conditional base path
- [Resilience & Errors](mem://tecnico/estabilidade-e-resiliencia) — Global ErrorBoundaries, QueryErrorState retries, and OfflineBanner
- [Auth & Recovery](mem://tecnico/autenticacao-e-recuperacao) — Google OAuth redirect requirements and email recovery setup
- [Google Cloud Verification](mem://tecnico/verificacao-google-cloud) — googlec9b3e1aa20186102.html requirement in public folder
- [Security RLS & Privacy](mem://tecnico/seguranca-rls-e-privacidade) — SECURITY DEFINER logic to circumvent infinite recursion in policies
- [Security Validation](mem://tecnico/seguranca-validacao-e-hardening) — Password complexity rules, HIBP check, private_code masking
- [WCAG Accessibility](mem://tecnico/acessibilidade-wcag) — AA compliance, semantic roles, and live regions
- [Standard Categories](mem://regras-negocio/categorias-padronizadas) — Centralized event categories enforced via src/constants/categories.ts
- [Private Events](mem://regras-negocio/eventos-privados) — Hidden from public listings, joinable via /events/join/:privateCode link
- [Visibility & Participation](mem://regras-negocio/visibilidade-e-participacao) — Hard capacity limits, 3h grace period for expiration, mandatory geodata
- [Persistent Privacy](mem://regras-negocio/privacidade-persistente) — Visibility/location preferences in privacy_preferences and enforced by RLS
- [Onboarding Flow](mem://funcionalidades/onboarding-e-ativacao) — 4-step wizard with localStorage drafting and onboarding_completed flag
- [Event Creation Wizard](mem://funcionalidades/criacao-evento-wizard) — 7-step auto-drafting creation form with conversational transitions
- [AI Event Covers](mem://funcionalidades/capas-ia-eventos) — AI image generation routing to Supabase storage instead of Base64
- [Geolocation Discovery](mem://funcionalidades/geolocalizacao-discovery) — Reverse geocoding for pre-fills and dynamic nearby recommendations
- [Recurring Events](mem://funcionalidades/eventos-recorrentes) — Automatic generation rules for up to 52 future schedule occurrences
- [Pinned Events](mem://funcionalidades/eventos-fixados) — Locally saved events with RLS-protected dedicated table
- [Direct Messages](mem://funcionalidades/mensagens-diretas) — Unified inbox, batch queries preventing N+1, event_message_reads tracking
- [Event Coordination Chat](mem://funcionalidades/chat-eventos-coordenacao) — Pinned messages, automated welcomes, and post-event read-only mode
- [Calendar Sharing](mem://funcionalidades/compartilhamento-calendario) — Web Share API hooks and .ics export compilation for external calendars
- [User Profiles](mem://funcionalidades/perfil-e-identidade-usuario) — Bio limits, Trust Score, merit badges, and transparent active penalties
- [Social Friends](mem://funcionalidades/social-amigos) — Connection requests, database trigger COALESCE fallbacks, and suggestions
- [Trust & Reputation System](mem://funcionalidades/sistema-reputacao-confianca) — Internal rep (0-100) vs Public Score (0-5), KYC bonuses, and badges
- [Moderation System](mem://funcionalidades/sistema-moderacao-e-seguranca) — Strike system, auto-suspensions based on rep dips, and evidence bucket
- [Realtime Moderation](mem://funcionalidades/moderacao-sincronizada-realtime) — Admin sync, revoke_penalty RPC, automated discipline notifications
- [Administrative Backoffice](mem://funcionalidades/backoffice-administrativo) — Isolated /admin route, role-based protection (moderator/admin), and logs
- [KYC/KYB Verification](mem://funcionalidades/verificacao-identidade-kyc-kyb) — Identity validation flows granting trust badges and bonus reputation points
- [Event Ratings](mem://funcionalidades/avaliacoes-eventos) — 1-5 star reviews tied to check-in completion and calculated Trust Scores
- [Push Notifications](mem://funcionalidades/notificacoes-e-push) — 30/day limit, contextual opt-ins post participation, unread badges
- [Daily Missions](mem://funcionalidades/missoes-diarias) — Gamified tasks based on calendar sync with custom gradient UI cards
- [Gamification & Feedback](mem://funcionalidades/gamificacao-e-feedback) — Creation confetti, toast undo support, organizer crown badges
- [Creator Dashboard](mem://funcionalidades/dashboard-criador) — Key analytics, participation charts, and feedback consolidation per event
- [Auto-Reengagement](mem://funcionalidades/reengajamento-automatico) — Edge function triggering event suggestions after 3 days of onboarding inactivity
- [Settings Center](mem://funcionalidades/sistema-configuracoes) — Unified preference control mapping Privacy, Account, Appearance, and FAQ
- [LGPD & Safety Compliance](mem://funcionalidades/conformidade-lgpd-e-seguranca-do-usuario) — user_consents logs, data export requests, real-life safety acknowledgments
- [Legal Documents](mem://funcionalidades/documentos-legais-e-consentimento) — Hosted /termos, PDF fallback, liability disclaimers mapping to consent tables
- [Audit Logging](mem://tecnico/sistema-de-logs-e-auditoria) — activity_logs capturing IPs/JSON metadata for logins, deletions, and reports
- [Success Metrics](mem://visao-projeto/metricas-sucesso) — North Star event completion funnel tracked via get_platform_metrics RPC
- [Spontaneous Mode](mem://funcionalidades/modo-espontaneo) — 2h availability with city+interest matching, pg_cron cleanup, realtime sync
