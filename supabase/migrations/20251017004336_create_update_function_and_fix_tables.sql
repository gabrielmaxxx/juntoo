/*
  # Criar função de atualização e corrigir estrutura

  1. Funções
    - Criar função update_updated_at_column
    
  2. Novas Tabelas
    - `profiles` - Perfis de usuários
    - `event_messages` - Mensagens em eventos
    - `notifications` - Notificações

  3. Correções
    - Remover política RLS recursiva
    - Tornar state e city obrigatórios
*/

-- Criar função para atualizar updated_at se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar tabela profiles se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar tabela event_messages se não existir
CREATE TABLE IF NOT EXISTS public.event_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- Criar tabela notifications se não existir
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('event_join', 'new_message', 'new_event')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  event_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Garantir que state e city existam com valores padrão
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'state'
  ) THEN
    ALTER TABLE public.events ADD COLUMN state TEXT DEFAULT 'SP' NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'city'
  ) THEN
    ALTER TABLE public.events ADD COLUMN city TEXT DEFAULT 'São Paulo' NOT NULL;
  END IF;
END $$;

-- Atualizar eventos que não têm state/city
UPDATE public.events 
SET state = 'SP' 
WHERE state IS NULL;

UPDATE public.events 
SET city = 'São Paulo' 
WHERE city IS NULL;

-- Tornar campos obrigatórios
ALTER TABLE public.events ALTER COLUMN state SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN city SET NOT NULL;

-- Remover política recursiva problemática
DROP POLICY IF EXISTS "Participants can view other participants" ON public.event_participants;

-- Criar política corrigida sem recursão
CREATE POLICY "Participants can view other participants"
ON public.event_participants
FOR SELECT
USING (
  user_id = auth.uid() OR
  event_id IN (
    SELECT ep.event_id FROM event_participants ep WHERE ep.user_id = auth.uid()
  )
);

-- Políticas para profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Políticas para event_messages
CREATE POLICY "Participants can view messages"
ON public.event_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = event_messages.event_id 
    AND ep.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON public.event_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = event_messages.event_id 
    AND ep.user_id = auth.uid()
  )
);

-- Políticas para notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Funções de notificação
CREATE OR REPLACE FUNCTION public.notify_event_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_title TEXT;
BEGIN
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, event_id)
  VALUES (
    NEW.user_id,
    'event_join',
    'Participação confirmada!',
    'Você confirmou presença em: ' || event_title,
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_join ON public.event_participants;
CREATE TRIGGER on_event_join
AFTER INSERT ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_join();

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_id UUID;
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.user_id;
  
  FOR participant_id IN 
    SELECT user_id FROM event_participants ep
    WHERE ep.event_id = NEW.event_id AND ep.user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, event_id)
    VALUES (
      participant_id,
      'new_message',
      'Nova mensagem no evento',
      sender_name || ' enviou uma mensagem',
      NEW.event_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON public.event_messages;
CREATE TRIGGER on_new_message
AFTER INSERT ON public.event_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

CREATE OR REPLACE FUNCTION public.notify_matching_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  IF NEW.is_private = false THEN
    FOR profile_record IN 
      SELECT user_id FROM profiles 
      WHERE NEW.category = ANY(interests) AND user_id != NEW.created_by
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, event_id)
      VALUES (
        profile_record.user_id,
        'new_event',
        'Novo evento do seu interesse!',
        'Um novo evento de ' || NEW.category || ' foi criado: ' || NEW.title,
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_event ON public.events;
CREATE TRIGGER on_new_event
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_events();