

## Google Login e Verificação de Site

### Análise do arquivo enviado

O arquivo `googlec9b3e1aa20186102.html` é um arquivo de verificação de propriedade do Google. Ele precisa ser acessível na raiz do site (ex: `https://juntoo.lovable.app/googlec9b3e1aa20186102.html`). Para isso, basta copiá-lo para a pasta `public/` do projeto.

### Seu procedimento está correto

O fluxo é:
1. Colocar o arquivo de verificação na raiz do site — **é isso que vamos fazer agora**
2. Verificar a propriedade no Google Cloud Console
3. Configurar o OAuth Consent Screen e criar as credenciais OAuth
4. Adicionar Client ID e Client Secret no Supabase Dashboard

### Plano de implementação

**Etapa 1 — Arquivo de verificação (implementação imediata)**
- Copiar `googlec9b3e1aa20186102.html` para `public/googlec9b3e1aa20186102.html`
- Isso torna o arquivo acessível em `https://juntoo.lovable.app/googlec9b3e1aa20186102.html`

**Etapa 2 — Após verificação (configuração manual no Google Cloud)**

Depois que o site for verificado, você precisará:

1. No **Google Cloud Console** → APIs & Services → **OAuth Consent Screen**:
   - Adicionar `hspfyakugditkxrvngrc.supabase.co` em **Authorized domains**
   - Configurar escopos: `email`, `profile`, `openid`

2. Em **Credentials** → Create OAuth Client ID (Web application):
   - **Authorized JavaScript origins**: `https://juntoo.lovable.app`
   - **Authorized redirect URLs**: `https://hspfyakugditkxrvngrc.supabase.co/auth/v1/callback`

3. No **Supabase Dashboard** → Authentication → Providers → Google:
   - Colar o **Client ID** e **Client Secret** obtidos no passo anterior
   - Habilitar o provider

4. No **Supabase Dashboard** → Authentication → URL Configuration:
   - **Site URL**: `https://juntoo.lovable.app`
   - **Redirect URLs**: adicionar `https://juntoo.lovable.app`

**Etapa 3 — Código (após configuração acima)**

O botão de login com Google já existe em `AuthPage.tsx` (função `handleGoogleSignIn`). Após a configuração do provider no Supabase, ele funcionará automaticamente.

### Resumo

A única alteração de código necessária agora é copiar o arquivo de verificação para `public/`. O restante é configuração nos dashboards do Google Cloud e Supabase.

