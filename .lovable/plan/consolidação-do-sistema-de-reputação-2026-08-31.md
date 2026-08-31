# Consolidação do sistema de reputação

Objetivo: uma única fórmula oficial de reputação (0–1000), com penalidades automáticas dentro da própria função, `user_trust_scores` alimentada automaticamente e badges mantidos como camada de exibição.

## 1. Fórmula oficial única

Positivos (pesos atuais mantidos):

```text
+10  por evento participado (evento já ocorrido)
+15  por evento criado
 +2  por avaliação feita
 +5  por avaliação positiva recebida (overall_rating >= 4)
+25  por conquista (badge de achievement)
```

Penalidades automáticas (novas, dentro da mesma função):

```text
-15  por não comparecimento após confirmar presença
-30  por cancelar evento como organizador com menos de 24h de antecedência
-50  por denúncia comprovada por moderação (report resolvido contra o usuário)
```

Override manual de moderador (excepcional): somatório dos ajustes manuais.

```text
score = CLAMP(0, 1000, positivos - penalidades + override_manual)
```

## 2. Dados que faltam no banco (bloqueio a resolver na migration)

Hoje não há como detectar no-show nem cancelamento de evento:

- `event_participants` não tem campo de presença → adicionar `attendance_status text` com valores `confirmed` (default), `attended`, `no_show`, preenchido pelo organizador/check-in.
- `events` não tem estado de cancelamento → adicionar `cancelled_at timestamptz` e `cancelled_by uuid`. O cálculo compara `cancelled_at` com `date + time` para saber se foi com menos de 24h.
- Denúncia comprovada = `reports.status = 'resolved'` com `reported_user_id` do usuário. Já existe, sem mudança de schema.

Nenhum dado histórico é perdido: registros antigos ficam como `confirmed` / não cancelados, ou seja, sem penalidade retroativa indevida.

## 3. Mudanças no banco (migration 1 — estrutura)

- Colunas novas acima, com defaults seguros e índices em `event_participants(attendance_status)` e `events(cancelled_at)`.
- Reescrever `calculate_reputation_score(p_user_id)` para retornar também `no_shows`, `late_cancellations`, `confirmed_reports`, `manual_adjustment`, `penalty_points` além do `score` e dos contadores atuais (retrocompatível com o front atual).
- Nova tabela `user_trust_score_overrides` (user_id, moderator_id, delta, reason, created_at) — é o único caminho para ajuste manual, com log de autoria e motivo. RLS: leitura só para moderador/admin e para o próprio usuário (o delta que o afeta); escrita só moderador/admin. GRANTs explícitos.
- Nova função `refresh_user_trust_score(p_user_id)`: chama a fórmula e faz upsert em `user_trust_scores` (escala 0–100 = score/10), gravando também o log em `user_reputation_log` quando o valor muda.
- Triggers chamando `refresh_user_trust_score` em: `event_participants` (insert/update), `events` (insert/update de cancelamento), `user_reviews`, `user_achievements`, `reports` (quando status vira `resolved`), `user_trust_score_overrides`.
- `apply_penalty` deixa de escrever direto em `user_trust_scores`; passa a registrar o motivo e chamar o recálculo. Suspensões/banimentos e bloqueios de função continuam iguais.

## 4. Migration 2 — recálculo do histórico

- Backfill: `refresh_user_trust_score` para todos os `user_id` de `profiles`, dentro de um único bloco.
- Antes do backfill, snapshot da tabela atual em `user_trust_scores_backup_2026_08` para permitir rollback e auditoria do antes/depois.
- Diferenças manuais existentes (scores mexidos por moderador) são convertidas em linhas de `user_trust_score_overrides` com `reason = 'migração: ajuste manual anterior'`, para que nenhum ajuste histórico seja apagado.

## 5. Frontend

- `useReputationScore.ts`: tipar os novos campos e exibir, no card de score, uma seção "Penalidades" (no-shows, cancelamentos tardios, denúncias confirmadas) com os pontos negativos.
- `ReputationScore.tsx`: novo bloco de itens negativos abaixo do breakdown atual, em tom destrutivo.
- `useUserReputation.ts`: adicionar comentário de documentação no topo declarando que os badges são camada **complementar de exibição qualitativa**, sem influenciar o score numérico oficial.
- Painel admin (`PenaltyActions`/`UserModerationProfile`): o campo de ajuste de score passa a gravar override com motivo obrigatório, e mostra o histórico de overrides.

## Risco e revisão

Este conjunto altera score exibido publicamente. Sugestão de ordem: aplicar migration 1 (estrutura + fórmula), revisar o antes/depois via consulta comparando `user_trust_scores_backup` com o novo cálculo, e só então aplicar o backfill.
