/**
 * Tradutor centralizado de erros técnicos para mensagens amigáveis em PT-BR.
 * Use `getFriendlyError(error, context?)` em qualquer bloco catch para obter
 * uma mensagem pronta para exibir em toast/UI.
 */

export type ErrorContext =
  | "auth"
  | "signup"
  | "event_join"
  | "event_create"
  | "review"
  | "friend_request"
  | "upload"
  | "message"
  | "generic";

interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

const AUTH_MAP: Record<string, string> = {
  "invalid login credentials": "Email ou senha incorretos. Tente novamente.",
  "invalid_credentials": "Email ou senha incorretos. Tente novamente.",
  "email not confirmed": "Confirme seu email antes de entrar. Verifique sua caixa de entrada.",
  "email_not_confirmed": "Confirme seu email antes de entrar. Verifique sua caixa de entrada.",
  "user already registered": "Este email já tem uma conta. Faça login ou recupere sua senha.",
  "user_already_exists": "Este email já tem uma conta. Faça login ou recupere sua senha.",
  "email address is already registered": "Este email já tem uma conta. Faça login ou recupere sua senha.",
  "password should be at least": "A senha precisa ter pelo menos 8 caracteres, com letras maiúsculas, minúsculas e números.",
  "weak_password": "Senha muito fraca. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas e números.",
  "rate limit": "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
  "over_request_rate_limit": "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
  "user not found": "Usuário não encontrado.",
  "invalid email": "Email inválido. Verifique e tente novamente.",
  "signup is disabled": "Cadastro temporariamente indisponível.",
};

const DUPLICATE_BY_CONTEXT: Partial<Record<ErrorContext, string>> = {
  event_join: "Você já confirmou presença neste evento.",
  event_create: "Já existe um evento com essas informações.",
  review: "Você já avaliou este evento.",
  friend_request: "Solicitação de amizade já enviada.",
  signup: "Este email já tem uma conta. Faça login ou recupere sua senha.",
  message: "Mensagem duplicada. Aguarde um instante.",
  generic: "Esta ação já foi realizada.",
};

export function getFriendlyError(
  error: unknown,
  context: ErrorContext = "generic"
): string {
  if (!error) return "Algo deu errado. Tente novamente.";

  const err = error as ErrorLike;
  const raw = (err.message || String(error) || "").toLowerCase();
  const code = (err.code || "").toLowerCase();

  // Regras de negócio sinalizadas pelo banco de dados
  if (raw.includes("new_user_event_limit")) {
    return "Contas criadas nas últimas 24 horas podem publicar até 2 eventos por dia. Tente novamente amanhã.";
  }
  if (raw.includes("new_user_message_limit")) {
    return "Contas novas podem enviar até 20 mensagens por hora. Tente novamente mais tarde.";
  }
  if (raw.includes("event_full") || raw.includes("event is full")) {
    return "Este evento já atingiu o número máximo de participantes.";
  }
  if (raw.includes("idade_nao_confirmada") || raw.includes("18 anos")) {
    return "É necessário ter 18 anos ou mais para usar o Juntoo.";
  }


  // Network / offline
  if (
    err.name === "NetworkError" ||
    raw.includes("failed to fetch") ||
    raw.includes("networkerror") ||
    raw.includes("network request failed") ||
    raw.includes("load failed") ||
    !navigator.onLine
  ) {
    return "Sem conexão. Verifique sua internet e tente novamente.";
  }

  // Auth-specific messages
  for (const key in AUTH_MAP) {
    if (raw.includes(key) || code === key) return AUTH_MAP[key];
  }

  // Postgres / RLS errors
  if (raw.includes("duplicate key") || code === "23505") {
    return DUPLICATE_BY_CONTEXT[context] || DUPLICATE_BY_CONTEXT.generic!;
  }
  if (raw.includes("foreign key") || code === "23503") {
    return "Esta ação não é possível no momento.";
  }
  if (
    raw.includes("row level security") ||
    raw.includes("row-level security") ||
    raw.includes("permission denied") ||
    code === "42501" ||
    code === "pgrst301"
  ) {
    return "Você não tem permissão para esta ação.";
  }
  if (raw.includes("not null") || code === "23502") {
    return "Preencha todos os campos obrigatórios.";
  }
  if (raw.includes("check constraint") || code === "23514") {
    return "Algumas informações não são válidas. Revise e tente novamente.";
  }

  // Upload errors
  if (context === "upload" || raw.includes("payload") || raw.includes("file size")) {
    if (raw.includes("too large") || raw.includes("payload too large") || raw.includes("file size")) {
      return "Imagem muito grande. Use uma imagem menor que 5MB.";
    }
    if (raw.includes("invalid mime") || raw.includes("unsupported") || raw.includes("type")) {
      return "Formato não suportado. Use JPG ou PNG.";
    }
  }

  // HTTP statuses
  if (err.status === 401 || err.status === 403) {
    return "Você não tem permissão para esta ação.";
  }
  if (err.status === 404) {
    return "Conteúdo não encontrado.";
  }
  if (err.status === 429) {
    return "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
  }
  if (err.status && err.status >= 500) {
    return "Nossos servidores estão instáveis. Tente novamente em instantes.";
  }

  // Fallback per context
  const fallback: Record<ErrorContext, string> = {
    auth: "Não foi possível entrar. Tente novamente.",
    signup: "Não foi possível concluir o cadastro. Tente novamente.",
    event_join: "Não foi possível confirmar presença. Tente novamente.",
    event_create: "Não foi possível criar o evento. Tente novamente.",
    review: "Não foi possível enviar sua avaliação. Tente novamente.",
    friend_request: "Não foi possível enviar a solicitação. Tente novamente.",
    upload: "Não foi possível enviar a imagem. Tente novamente.",
    message: "Não foi possível enviar a mensagem. Tente novamente.",
    generic: "Algo deu errado. Tente novamente.",
  };
  return fallback[context];
}

/**
 * Validador de arquivos de imagem antes do upload.
 * Retorna mensagem de erro amigável ou null se válido.
 */
export function validateImageFile(file: File, maxMB = 5): string | null {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return "Formato não suportado. Use JPG ou PNG.";
  }
  if (file.size > maxMB * 1024 * 1024) {
    return `Imagem muito grande. Use uma imagem menor que ${maxMB}MB.`;
  }
  return null;
}
