---
name: Sistema de Comunidades
description: Comunidades com eventos recorrentes, chat, membros, roles admin/member, e comunidades públicas/privadas
type: feature
---
- Tabelas: `communities`, `community_members`, `community_messages`, `recurring_community_events`
- Enums: `community_member_role` (admin, member), `community_recurrence` (weekly, biweekly, monthly)
- Funções SECURITY DEFINER: `is_community_admin`, `is_community_member` (evitam recursão RLS)
- Trigger `auto_add_community_creator`: criador vira admin automaticamente
- Trigger `update_community_member_count`: incremento/decremento automático
- Comunidades privadas: novos membros entram com status `pending`, precisam de aprovação de admin
- Chat: apenas membros aprovados podem ver e enviar mensagens
- Eventos recorrentes: apenas admins podem criar/editar
- Componentes: CommunityCard, CommunityList, CommunityPage (abas: sobre/membros/eventos/chat), CreateCommunityForm, RecurringEventSetup
- CommunitiesTab orquestra navegação interna (lista → detalhe → criar → recurring setup)
- Acessível via tab `?tab=communities` no Index ou seção "Comunidades" na HomePage
- Realtime: subscriptions em community_members e community_messages
