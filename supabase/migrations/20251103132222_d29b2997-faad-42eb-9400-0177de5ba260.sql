-- Fix search_path for existing functions to prevent security issues
-- This ensures functions run with a predictable search path

-- Update notify_event_join function
CREATE OR REPLACE FUNCTION public.notify_event_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Update notify_new_message function
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  participant_id UUID;
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.user_id;
  
  FOR participant_id IN 
    SELECT user_id FROM event_participants 
    WHERE event_id = NEW.event_id AND user_id != NEW.user_id
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
$function$;

-- Update notify_matching_events function
CREATE OR REPLACE FUNCTION public.notify_matching_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;