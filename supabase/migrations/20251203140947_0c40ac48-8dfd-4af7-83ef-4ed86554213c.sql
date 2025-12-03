-- Trigger to notify OTHER participants when someone joins an event they're in
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
  -- Get event title
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;
  
  -- Get new member's name
  SELECT full_name INTO new_member_name FROM profiles WHERE user_id = NEW.user_id;
  
  -- Notify all OTHER participants (not the one who just joined)
  FOR participant_id IN 
    SELECT user_id FROM event_participants 
    WHERE event_id = NEW.event_id AND user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, event_id)
    VALUES (
      participant_id,
      'participant_joined',
      'Novo participante!',
      new_member_name || ' confirmou presença em: ' || event_title,
      NEW.event_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for notifying other participants
DROP TRIGGER IF EXISTS on_participant_joined_notify_others ON event_participants;
CREATE TRIGGER on_participant_joined_notify_others
AFTER INSERT ON event_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_other_participants_on_join();

-- Trigger to notify participants when event is updated
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
  -- Build changes description
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
  
  -- Only notify if there are meaningful changes
  IF changes_text != '' THEN
    FOR participant_id IN 
      SELECT user_id FROM event_participants 
      WHERE event_id = NEW.id AND user_id != NEW.created_by
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, event_id)
      VALUES (
        participant_id,
        'event_updated',
        'Evento atualizado',
        'O evento "' || NEW.title || '" teve alterações: ' || changes_text,
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for event updates
DROP TRIGGER IF EXISTS on_event_updated_notify ON events;
CREATE TRIGGER on_event_updated_notify
AFTER UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_update();