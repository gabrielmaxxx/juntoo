#!/bin/bash
# ============================================
# Juntoo - Auditoria de Segurança
# ============================================
# Verifica credenciais expostas e configuração de segurança
# Uso: bash scripts/security-check.sh
# ============================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ISSUES=0
WARNINGS=0

log_ok()   { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; ((WARNINGS++)); }
log_fail() { echo -e "${RED}❌ $1${NC}"; ((ISSUES++)); }

echo "=========================================="
echo " Juntoo - Auditoria de Segurança"
echo "=========================================="
echo ""

# ─── 1. Verificar .gitignore ───
echo "── 1. Verificando .gitignore ──"

if [ -f .gitignore ]; then
  for pattern in ".env" ".env.local" ".env.production" "node_modules" "dist"; do
    if grep -qF "$pattern" .gitignore 2>/dev/null; then
      log_ok "$pattern está no .gitignore"
    else
      log_fail "$pattern NÃO está no .gitignore"
    fi
  done
else
  log_fail ".gitignore não encontrado"
fi
echo ""

# ─── 2. Buscar padrões suspeitos em código ───
echo "── 2. Buscando credenciais hardcoded ──"

declare -A PATTERNS
PATTERNS=(
  ["service_role"]="Supabase Service Role Key"
  ["sk_live_"]="Stripe Live Secret Key"
  ["sk_test_"]="Stripe Test Secret Key"
  ["AIza"]="Google API Key"
  ["AKIA"]="AWS Access Key"
  ["ghp_"]="GitHub Personal Token"
  ["glpat-"]="GitLab Token"
  ["xoxb-"]="Slack Bot Token"
  ["-----BEGIN.*PRIVATE KEY"]="Private Key PEM"
)

SCAN_DIRS="src supabase/functions"
SCAN_EXT="ts,tsx,js,jsx,json"

for pattern in "${!PATTERNS[@]}"; do
  label="${PATTERNS[$pattern]}"
  matches=$(grep -rlE "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" $SCAN_DIRS 2>/dev/null | grep -v node_modules | grep -v ".test." | grep -v ".example" || true)

  if [ -n "$matches" ]; then
    # Check if it's just a Deno.env.get reference (safe)
    safe=true
    while IFS= read -r file; do
      # Lines containing the pattern that aren't env.get or comments
      unsafe_lines=$(grep -n "$pattern" "$file" | grep -v "Deno.env.get" | grep -v "import.meta.env" | grep -v "process.env" | grep -v "^[[:space:]]*//" | grep -v "^[[:space:]]*\*" || true)
      if [ -n "$unsafe_lines" ]; then
        safe=false
        log_fail "Possível $label em: $file"
        echo "         $unsafe_lines"
      fi
    done <<< "$matches"
    if $safe; then
      log_ok "Referências a $label são apenas via env vars (seguro)"
    fi
  else
    log_ok "Nenhum $label encontrado no código"
  fi
done

# Check for hardcoded JWTs (eyJhbGc pattern) in source code (not .env)
jwt_matches=$(grep -rlE 'eyJhbGciOi' --include="*.ts" --include="*.tsx" --include="*.js" $SCAN_DIRS 2>/dev/null | grep -v node_modules | grep -v ".test." || true)
if [ -n "$jwt_matches" ]; then
  for file in $jwt_matches; do
    # Check if it's in a test file referencing env vars
    if grep -q "Deno.env.get\|import.meta.env\|process.env" "$file" 2>/dev/null; then
      continue
    fi
    log_fail "JWT hardcoded encontrado em: $file"
  done
  # If we didn't fail on any, it's safe
  if [ $ISSUES -eq 0 ]; then
    log_ok "Nenhum JWT hardcoded no código fonte"
  fi
else
  log_ok "Nenhum JWT hardcoded no código fonte"
fi
echo ""

# ─── 3. Verificar .env não versionado ───
echo "── 3. Verificando arquivos .env ──"

if [ -f .env ]; then
  if git ls-files --error-unmatch .env &>/dev/null 2>&1; then
    log_fail ".env está sendo rastreado pelo git!"
  else
    log_ok ".env existe mas NÃO está no git"
  fi
else
  log_warn ".env não encontrado (necessário para desenvolvimento local)"
fi

if [ -f .env.example ]; then
  log_ok ".env.example existe como referência"
else
  log_warn ".env.example não encontrado"
fi
echo ""

# ─── 4. Verificar headers de segurança ───
echo "── 4. Verificando headers de segurança ──"

if [ -f index.html ]; then
  if grep -q "Content-Security-Policy" index.html 2>/dev/null; then
    log_ok "CSP configurado no index.html"
  else
    log_warn "CSP não encontrado no index.html (verificar se está em _headers ou vercel.json)"
  fi
fi

for header_file in "public/_headers" "vercel.json" "netlify.toml"; do
  if [ -f "$header_file" ]; then
    log_ok "Arquivo de headers encontrado: $header_file"
  fi
done
echo ""

# ─── 5. Verificar dependências com vulnerabilidades ───
echo "── 5. Verificando configurações sensíveis ──"

# Check for dangerouslySetInnerHTML
unsafe_html=$(grep -rl "dangerouslySetInnerHTML" --include="*.tsx" --include="*.ts" src/ 2>/dev/null || true)
if [ -n "$unsafe_html" ]; then
  log_warn "dangerouslySetInnerHTML usado em: $unsafe_html"
else
  log_ok "Nenhum uso de dangerouslySetInnerHTML"
fi

# Check for eval usage
eval_usage=$(grep -rlE "\beval\s*\(" --include="*.ts" --include="*.tsx" src/ 2>/dev/null || true)
if [ -n "$eval_usage" ]; then
  log_fail "eval() encontrado em: $eval_usage"
else
  log_ok "Nenhum uso de eval()"
fi

# Check for console.log with sensitive data patterns
sensitive_logs=$(grep -rnE "console\.(log|debug|info)\(.*\b(password|token|secret|key|credential)" --include="*.ts" --include="*.tsx" src/ 2>/dev/null || true)
if [ -n "$sensitive_logs" ]; then
  log_warn "Console.log com dados potencialmente sensíveis:"
  echo "         $sensitive_logs"
else
  log_ok "Nenhum log de dados sensíveis encontrado"
fi
echo ""

# ─── Resultado ───
echo "=========================================="
if [ $ISSUES -gt 0 ]; then
  echo -e "${RED}❌ FALHOU: $ISSUES problema(s) crítico(s) e $WARNINGS aviso(s)${NC}"
  echo "   Corrija os problemas acima antes do deploy."
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  PASSOU COM AVISOS: $WARNINGS aviso(s)${NC}"
  echo "   Revise os avisos acima."
  exit 0
else
  echo -e "${GREEN}✅ PASSOU: Nenhuma credencial exposta encontrada${NC}"
  exit 0
fi
