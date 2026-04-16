---
name: Modo Espontâneo
description: Funcionalidade que permite usuários sinalizarem disponibilidade imediata por 2h, com matching por cidade e interesses em comum
type: feature
---
- Tabela `availability` com user_id, interests[], city, location_lat/lng, expires_at, is_active
- Constraint UNIQUE (user_id, is_active) garante apenas 1 registro ativo por usuário
- Timer automático de 2h com desativação manual possível
- Visível apenas para usuários na mesma cidade com pelo menos 1 interesse em comum (RPC `get_available_users`)
- Máximo 50 usuários retornados por consulta, ordenados por mais recente
- Cron job `cleanup-expired-availability` roda a cada 15min via pg_cron
- Componentes: `ImAvailableButton` (home), `AvailableNow` (página completa via tab=available)
- Realtime: subscription na tabela availability com delay de 2s
- Hook central: `useAvailability` em `src/features/availability/hooks/`
