---
name: Reputação consolidada
description: Fórmula oficial única de reputação (0-1000), penalidades automáticas, user_trust_scores derivada e badges como camada de exibição
type: feature
---

Fonte única de verdade: função `calculate_reputation_score(user_id)` no Postgres.

Positivos: +10 evento participado (já ocorrido, não cancelado, não no-show), +15 evento criado,
+2 avaliação feita, +5 avaliação positiva recebida (overall >= 4), +25 conquista.

Penalidades automáticas (lidas do banco, não manuais): -15 por `event_participants.attendance_status = 'no_show'`,
-30 por evento cancelado (`events.cancelled_at`) com menos de 24h do início, -50 por `reports.status = 'resolved'`
contra o usuário.

`score = CLAMP(0, 1000, positivos - penalidades + soma dos overrides manuais)`.

- `user_trust_scores` (0-100) é **derivada automaticamente** = round(score/10), via `refresh_user_trust_score()`
  disparada por triggers em event_participants, events, user_reviews, user_achievements, reports e overrides.
  Nunca escrever nela diretamente do app.
- Ajuste manual só via `user_trust_score_overrides` (moderator_id + reason obrigatórios). `apply_penalty` grava override.
- Badges de `useUserReputation.ts` são camada de exibição qualitativa complementar — não afetam o score.
- Backup pré-migração em `user_trust_scores_backup_2026_08`.
