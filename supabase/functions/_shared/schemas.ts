import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ─── Categories matching src/constants/categories.ts ───
const CATEGORIES = [
  'Esportes', 'Música', 'Arte', 'Tecnologia', 'Culinária',
  'Viagem', 'Fotografia', 'Leitura', 'Cinema', 'Dança',
  'Natureza', 'Fitness', 'Educação', 'Social', 'Negócios',
  'Jogos', 'Outro'
] as const;

// ─── Helpers ───
const sanitizeString = (val: string) =>
  val.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim();

const sanitized = (min = 0, max = 500) =>
  z.string().trim().min(min).max(max).transform(sanitizeString);

// ─── Create Event Schema ───
export const createEventSchema = z.object({
  title: sanitized(3, 100),
  description: sanitized(0, 2000).optional().or(z.literal('')),
  category: z.enum(CATEGORIES),
  state: z.string().min(2, 'Estado é obrigatório'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  location: sanitized(3, 200),
  date: z.string().min(1).refine((val) => {
    const d = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  }, 'Data não pode ser no passado'),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido'),
  price: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === '' || val === null) return 0;
    const n = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(n) || n < 0 ? 0 : n;
  }),
  maxParticipants: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
    if (val === undefined || val === '' || val === null) return null;
    const n = typeof val === 'string' ? parseInt(val) : val;
    return isNaN(n) || n < 1 ? null : n;
  }),
  isPrivate: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(['none', 'weekly', 'biweekly', 'monthly']).default('none'),
  recurrenceEndDate: z.string().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal(''))
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

// ─── Create Review Schema ───
export const createReviewSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
  rating: z.number().int().min(1, 'Mínimo 1 estrela').max(5, 'Máximo 5 estrelas'),
  comment: sanitized(0, 1000).optional().or(z.literal(''))
});

// ─── Create User Review Schema ───
export const createUserReviewSchema = z.object({
  eventId: z.string().uuid(),
  reviewedUserId: z.string().uuid(),
  respectRating: z.number().int().min(1).max(5),
  punctualityRating: z.number().int().min(1).max(5),
  reliabilityRating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5),
  safetyRating: z.number().int().min(1).max(5),
  comment: sanitized(0, 200).optional().or(z.literal(''))
});

// ─── Update Profile Schema ───
export const updateProfileSchema = z.object({
  fullName: sanitized(2, 100).optional(),
  bio: sanitized(0, 150).optional().or(z.literal('')),
  city: z.string().max(200).optional().or(z.literal('')),
  interests: z.array(z.enum(CATEGORIES)).max(10, 'Máximo 10 interesses').optional()
});

// ─── Chat Message Schema ───
export const chatMessageSchema = z.object({
  eventId: z.string().uuid(),
  message: sanitized(1, 500)
});

// ─── Report Schema ───
export const reportSchema = z.object({
  reportedUserId: z.string().uuid().optional(),
  reportedEventId: z.string().uuid().optional(),
  reportedMessageId: z.string().uuid().optional(),
  category: z.enum([
    'harassment', 'hate_speech', 'sexual_content', 'spam',
    'fraud', 'fake_profile', 'suspicious_behavior',
    'dangerous_event', 'misleading_event', 'other'
  ]),
  description: sanitized(0, 1000).optional().or(z.literal(''))
}).refine(
  (d) => d.reportedUserId || d.reportedEventId || d.reportedMessageId,
  'Deve especificar o alvo da denúncia'
);

// ─── Formatting helpers ───
export function formatZodErrors(error: z.ZodError) {
  return {
    errors: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code
    }))
  };
}
