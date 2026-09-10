import { z } from 'zod';
import { CATEGORIES } from '@/constants/categories';
import { isBeforeToday } from '@/lib/dateUtils';


// Schema de validação para criação de eventos
export const eventFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres'),
  
  description: z
    .string()
    .trim()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
    .optional()
    .or(z.literal('')),
  
  category: z
    .string()
    .refine((val) => CATEGORIES.includes(val as any), 'Selecione uma categoria válida'),
  
  state: z
    .string()
    .min(2, 'Selecione um estado'),
  
  city: z
    .string()
    .min(2, 'Selecione uma cidade'),
  
  location: z
    .string()
    .trim()
    .min(3, 'Local deve ter pelo menos 3 caracteres')
    .max(200, 'Local deve ter no máximo 200 caracteres'),
  
  date: z
    .string()
    .min(1, 'Selecione uma data')
    .refine((val) => !isBeforeToday(val), 'A data não pode ser no passado'),
  
  time: z
    .string()
    .min(1, 'Selecione um horário')
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido'),

  
  price: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Preço deve ser um número positivo'),
  
  maxParticipants: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 1;
    }, 'Número de participantes deve ser pelo menos 1'),
  
  isPrivate: z.boolean().default(false),
  
  isRecurring: z.boolean().default(false),
  
  recurrenceType: z.enum(['none', 'weekly', 'biweekly', 'monthly']).default('none'),
  
  recurrenceEndDate: z
    .string()
    .optional()
    .or(z.literal('')),
  
  imageUrl: z.string().optional().or(z.literal(''))
}).refine(
  (data) => {
    if (!data.date || !data.time) return true;
    const target = new Date(`${data.date}T${data.time}:00`).getTime();
    // tolerância de 5 minutos para evitar rejeição por diferença de relógio
    return target > Date.now() - 5 * 60 * 1000;
  },
  { message: 'O horário escolhido já passou. Escolha um horário futuro.', path: ['time'] }
);


export type EventFormData = z.infer<typeof eventFormSchema>;

// Validação inicial padrão
export const defaultEventFormData: EventFormData = {
  title: '',
  description: '',
  category: '',
  state: '',
  city: '',
  location: '',
  date: '',
  time: '',
  price: '',
  maxParticipants: '',
  isPrivate: false,
  isRecurring: false,
  recurrenceType: 'none',
  recurrenceEndDate: '',
  imageUrl: ''
};
