-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  event_join BOOLEAN NOT NULL DEFAULT true,
  participant_joined BOOLEAN NOT NULL DEFAULT true,
  event_updated BOOLEAN NOT NULL DEFAULT true,
  new_message BOOLEAN NOT NULL DEFAULT true,
  new_event BOOLEAN NOT NULL DEFAULT true,
  friend_request BOOLEAN NOT NULL DEFAULT true,
  event_reminder BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user wants a specific notification type
CREATE OR REPLACE FUNCTION public.user_wants_notification(p_user_id UUID, p_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pref_exists BOOLEAN;
  pref_value BOOLEAN;
BEGIN
  -- Check if preferences exist
  SELECT EXISTS(SELECT 1 FROM notification_preferences WHERE user_id = p_user_id) INTO pref_exists;
  
  -- If no preferences, default to true (send all notifications)
  IF NOT pref_exists THEN
    RETURN true;
  END IF;
  
  -- Get the specific preference
  EXECUTE format('SELECT %I FROM notification_preferences WHERE user_id = $1', p_type)
  INTO pref_value
  USING p_user_id;
  
  RETURN COALESCE(pref_value, true);
END;
$$;

-- Update existing triggers to check preferences

-- Update notify_event_join
CREATE OR REPLACE FUNCTION public.notify_event_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_title TEXT;
BEGIN
  -- Check if user wants this notification
  IF NOT user_wants_notification(NEW.user_id, 'event_join') THEN
    RETURN NEW;
  END IF;

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

-- Update notify_other_participants_on_join
CREATE OR REPLACE FUNCTION public.notify_other_participants_on_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_title TEXT;
  new_member_name TEXT;
  participant_id UUID;
BEGIN
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;
  SELECT full_name INTO new_member_name FROM profiles WHERE user_id = NEW.user_id;
  
  FOR participant_id IN 
    SELECT user_id FROM event_participants 
    WHERE event_id = NEW.event_id AND user_id != NEW.user_id
  LOOP
    -- Check if participant wants this notification
    IF user_wants_notification(participant_id, 'participant_joined') THEN
      INSERT INTO public.notifications (user_id, type, title, message, event_id)
      VALUES (
        participant_id,
        'participant_joined',
        'Novo participante!',
        new_member_name || ' confirmou presença em: ' || event_title,
        NEW.event_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update notify_event_update
CREATE OR REPLACE FUNCTION public.notify_event_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant_id UUID;
  changes_text TEXT := '';
BEGIN
  IF OLD.title != NEW.title THEN
    changes_text := 'título';
  END IF;
  IF OLD.date != NEW.date THEN
    changes_text := CASE WHEN changes_text = '' THEN 'data' ELSE changes_text || ', data' END;
  END IF;
  IF OLD.time != NEW.time THEN
    changes_text := CASE WHEN changes_text = '' THEN 'horário' ELSE changes_text || ', horário' END;
  END IF;
  IF OLD.location != NEW.location THEN
    changes_text := CASE WHEN changes_text = '' THEN 'local' ELSE changes_text || ', local' END;
  END IF;
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    changes_text := CASE WHEN changes_text = '' THEN 'descrição' ELSE changes_text || ', descrição' END;
  END IF;
  
  IF changes_text != '' THEN
    FOR participant_id IN 
      SELECT user_id FROM event_participants 
      WHERE event_id = NEW.id AND user_id != NEW.created_by
    LOOP
      -- Check if participant wants this notification
      IF user_wants_notification(participant_id, 'event_updated') THEN
        INSERT INTO public.notifications (user_id, type, title, message, event_id)
        VALUES (
          participant_id,
          'event_updated',
          'Evento atualizado',
          'O evento "' || NEW.title || '" teve alterações: ' || changes_text,
          NEW.id
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_new_message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant_id UUID;
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.user_id;
  
  FOR participant_id IN 
    SELECT user_id FROM event_participants 
    WHERE event_id = NEW.event_id AND user_id != NEW.user_id
  LOOP
    -- Check if participant wants this notification
    IF user_wants_notification(participant_id, 'new_message') THEN
      INSERT INTO public.notifications (user_id, type, title, message, event_id)
      VALUES (
        participant_id,
        'new_message',
        'Nova mensagem no evento',
        sender_name || ' enviou uma mensagem',
        NEW.event_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update notify_matching_events
CREATE OR REPLACE FUNCTION public.notify_matching_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  IF NEW.is_private = false THEN
    FOR profile_record IN 
      SELECT user_id FROM profiles 
      WHERE NEW.category = ANY(interests) AND user_id != NEW.created_by
    LOOP
      -- Check if user wants this notification
      IF user_wants_notification(profile_record.user_id, 'new_event') THEN
        INSERT INTO public.notifications (user_id, type, title, message, event_id)
        VALUES (
          profile_record.user_id,
          'new_event',
          'Novo evento do seu interesse!',
          'Um novo evento de ' || NEW.category || ' foi criado: ' || NEW.title,
          NEW.id
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_friend_request
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Check if recipient wants friend request notifications
  IF NOT user_wants_notification(NEW.friend_id, 'friend_request') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO public.notifications (
    user_id, type, title, message, event_id, read
  )
  VALUES (
    NEW.friend_id,
    'friend_request',
    'Nova solicitação de amizade',
    sender_name || ' quer ser seu amigo!',
    NEW.id::text,
    false
  );
  
  RETURN NEW;
END;
$$;