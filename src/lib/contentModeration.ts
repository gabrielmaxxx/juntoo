const FORBIDDEN_EVENT_TERMS = [
  'nude',
  'nudes',
  'sexo',
  'sexual',
  '18+',
  'pornô',
  'porno',
  'pornografia',
  'escort',
  'acompanhante',
];

const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const findForbiddenEventTerm = (fields: Array<string | null | undefined>) => {
  const content = normalizeText(fields.filter(Boolean).join(' '));
  return FORBIDDEN_EVENT_TERMS.find((term) => content.includes(normalizeText(term))) || null;
};