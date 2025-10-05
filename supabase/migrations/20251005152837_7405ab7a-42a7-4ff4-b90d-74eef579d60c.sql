-- Adicionar campos de cidade e estado na tabela events
ALTER TABLE public.events 
ADD COLUMN state TEXT,
ADD COLUMN city TEXT;

-- Atualizar eventos existentes com valores padrão
UPDATE public.events 
SET state = 'SP', city = 'Valença' 
WHERE state IS NULL OR city IS NULL;