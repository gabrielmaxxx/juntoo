# Configuração de Branch Protection — GitHub

## Como configurar

1. Acesse **Settings → Branches** no repositório GitHub
2. Clique em **Add branch protection rule**
3. Em **Branch name pattern**, digite: `main`

## Regras recomendadas

### ✅ Require a pull request before merging
- **Require approvals**: 1
- **Dismiss stale pull request approvals when new commits are pushed**: ✅
- **Require review from Code Owners**: opcional

### ✅ Require status checks to pass before merging
Marque os seguintes checks como obrigatórios:
- `Lint & Typecheck`
- `Unit Tests`
- `Security Audit`
- `Build`

### ✅ Require branches to be up to date before merging
Garante que o PR está atualizado com a `main`.

### ✅ Include administrators
Administradores também devem seguir as mesmas regras.

### ⚙️ Opcionais recomendados
- **Require signed commits**: para equipes maiores
- **Require linear history**: evita merge commits bagunçados
- **Do not allow bypassing the above settings**: máxima segurança

## Secrets necessárias no GitHub

Acesse **Settings → Secrets and variables → Actions** e adicione:

| Secret | Descrição |
|--------|-----------|
| `VITE_SUPABASE_URL` | URL pública do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima (publishable) do Supabase |
| `NETLIFY_AUTH_TOKEN` | Token de deploy Netlify (se usar) |
| `NETLIFY_SITE_ID` | ID do site Netlify (se usar) |
| `VERCEL_TOKEN` | Token de deploy Vercel (se usar) |
| `VERCEL_ORG_ID` | ID da org Vercel (se usar) |
| `VERCEL_PROJECT_ID` | ID do projeto Vercel (se usar) |

## Variables (não secretas)

| Variable | Descrição |
|----------|-----------|
| `DEPLOY_URL` | URL de produção para smoke test (default: `https://juntoo.lovable.app`) |
