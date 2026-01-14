import { z } from 'zod';

// Schema para validação de perfil
export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  city: z
    .string()
    .max(200, 'Localização deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  
  interests: z
    .array(z.string())
    .max(10, 'Você pode selecionar no máximo 10 interesses')
    .optional()
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Schema para validação de reviews
export const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, 'Selecione pelo menos 1 estrela')
    .max(5, 'Máximo de 5 estrelas'),
  
  comment: z
    .string()
    .trim()
    .max(1000, 'Comentário deve ter no máximo 1000 caracteres')
    .optional()
    .or(z.literal(''))
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

// Schema para mensagens do chat
export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Mensagem não pode estar vazia')
    .max(500, 'Mensagem deve ter no máximo 500 caracteres')
});

export type ChatMessageData = z.infer<typeof chatMessageSchema>;

// Schema para busca/filtros
export const searchFiltersSchema = z.object({
  text: z
    .string()
    .trim()
    .max(100, 'Busca deve ter no máximo 100 caracteres')
    .optional(),
  
  category: z.string().optional(),
  
  state: z.string().optional(),
  
  city: z.string().optional(),
  
  date: z.date().optional(),
  
  priceRange: z.enum(['all', 'free', 'paid']).default('all')
});

export type SearchFiltersData = z.infer<typeof searchFiltersSchema>;
