-- Adicionar campos de recorrência na tabela events
ALTER TABLE public.events 
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurrence_type TEXT CHECK (recurrence_type IN ('none', 'weekly', 'biweekly', 'monthly')),
ADD COLUMN recurrence_end_date DATE,
ADD COLUMN parent_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance de busca de eventos recorrentes
CREATE INDEX idx_events_parent_event_id ON public.events(parent_event_id) WHERE parent_event_id IS NOT NULL;

-- Atualizar eventos existentes
UPDATE public.events 
SET is_recurring = false, recurrence_type = 'none' 
WHERE is_recurring IS NULL;