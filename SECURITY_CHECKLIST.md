# Juntoo - Checklist de Segurança Pré-Deploy

> Revise cada item antes de publicar uma nova versão em produção.

## 🔑 Secrets & Variáveis de Ambiente

- [ ] `.env` **NÃO** está commitado no repositório
- [ ] `.env.example` está atualizado com todas as variáveis necessárias
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está **apenas** nos Secrets do Lovable/Supabase (nunca no frontend)
- [ ] `VAPID_PRIVATE_KEY` está **apenas** nos Secrets (nunca exposta ao cliente)
- [ ] Nenhuma chave privada hardcoded em arquivos `.ts`/`.tsx`
- [ ] Script `scripts/security-check.sh` executa sem falhas

## 🛡️ Autenticação & Autorização

- [ ] JWT é validado server-side via `getClaims()` em todas as Edge Functions
- [ ] Nenhuma Edge Function aceita requests sem autenticação (exceto webhooks com assinatura)
- [ ] Rate limiting configurado nas Edge Functions críticas (create-event: 10/dia)
- [ ] Passwords: mínimo 8 caracteres, upper + lower + número
- [ ] Leaked Password Protection **habilitado** no Supabase Dashboard

## 🔒 Row Level Security (RLS)

- [ ] **Todas** as tabelas têm RLS habilitado
- [ ] Perfis: apenas o dono pode UPDATE
- [ ] Eventos privados: visíveis apenas para criador e participantes
- [ ] Mensagens: apenas participantes do evento podem ler/escrever
- [ ] Notificações: apenas o dono pode ler/atualizar
- [ ] Reviews de usuário: UPDATE/DELETE limitados a 24h
- [ ] `user_roles`: apenas admins podem INSERT/UPDATE/DELETE
- [ ] Trigger `check_event_capacity` impede participação em eventos lotados
- [ ] `realtime.messages`: políticas RLS configuradas para canais

## 🌐 Headers de Segurança

- [ ] Content-Security-Policy configurado
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` restringindo APIs desnecessárias

## 📦 Storage

- [ ] Bucket `avatars`: restringir SELECT para evitar listagem pública
- [ ] Bucket `report-evidence`: sem acesso público
- [ ] Bucket `verification-documents`: sem acesso público
- [ ] Upload limitado a 5MB por arquivo
- [ ] Tipos de arquivo validados (JPEG, PNG, WebP)

## 🧹 Sanitização de Input

- [ ] Validação Zod em todas as Edge Functions
- [ ] Sanitização de HTML/XSS em inputs de texto
- [ ] `encodeURIComponent` em URLs construídas com input do usuário
- [ ] Nenhum uso de `dangerouslySetInnerHTML` com dados do usuário
- [ ] Nenhum uso de `eval()` no código

## 📊 Monitoramento

- [ ] `activity_logs` registrando ações críticas (login, delete, report)
- [ ] IP addresses **não** expostas ao cliente
- [ ] Console.log removido em produção para dados sensíveis
- [ ] Erros genéricos para o usuário (sem stack traces no frontend)

## 🚀 Deploy

- [ ] Build sem erros TypeScript
- [ ] Edge Functions deployadas e testadas
- [ ] Verificar CORS headers em todas as Edge Functions
- [ ] Google Cloud verification file presente (`public/googlec9b3e1aa20186102.html`)
- [ ] robots.txt e sitemap.xml atualizados

---

*Última revisão: 2026-04-16*
*Responsável: Equipe Juntoo*
