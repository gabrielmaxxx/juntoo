/**
 * Utilitários de data/hora seguros para fuso horário.
 *
 * Problema que isto resolve: `new Date('2026-09-09')` é interpretado pelo
 * JavaScript como meia-noite em UTC. No Brasil (UTC-3) isso faz a data
 * "voltar" um dia na exibição e faz um evento de hoje parecer estar no
 * passado. Todas as datas dos eventos são datas locais (sem fuso), então
 * sempre use estes helpers.
 */

/** Converte "YYYY-MM-DD" (ou Date/ISO) em Date no fuso local, à meia-noite. */
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) return new Date(`${value}T00:00:00`);
  return new Date(value);
}

/** Combina data ("YYYY-MM-DD") e horário ("HH:MM") no fuso local. */
export function parseLocalDateTime(date: string, time?: string | null): Date {
  const safeTime = time && /^\d{1,2}:\d{2}/.test(time)
    ? time.length === 4 ? `0${time}` : time.slice(0, 5)
    : '00:00';
  return new Date(`${date}T${safeTime}:00`);
}

/** Hoje no formato "YYYY-MM-DD" usando o fuso local (para inputs type="date"). */
export function todayLocalISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
}

/** Converte um Date para "YYYY-MM-DD" preservando o dia local. */
export function toLocalISODate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

/** True se a data (dia inteiro) é anterior a hoje no fuso local. */
export function isBeforeToday(date: string | Date): boolean {
  const d = parseLocalDate(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

/** True se data+hora já passaram (com tolerância opcional em minutos). */
export function isPastDateTime(date: string, time?: string | null, toleranceMinutes = 0): boolean {
  const target = parseLocalDateTime(date, time).getTime();
  return target + toleranceMinutes * 60000 < Date.now();
}

/** Formata data do evento em pt-BR sem deslocar o dia. */
export function formatEventDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  return parseLocalDate(date).toLocaleDateString('pt-BR', options);
}
