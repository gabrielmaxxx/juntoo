
-- 1. Helper: rate-limit notifications (max 30/day per user)
CREATE OR REPLACE FUNCTION public.can_send_notification(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 30
  FROM public.notifications
  WHERE user_id = p_user_id
    AND created_at > now() - interval '24 hours';
$$;

-- 2. Trigger: notify user when they receive a review
CREATE OR REPLACE FUNCTION public.notify_user_review_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reviewer_name TEXT;
  event_title TEXT;
BEGIN
  -- Check daily limit
  IF NOT can_send_notification(NEW.reviewed_user_id) THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO reviewer_name FROM profiles WHERE user_id = NEW.reviewer_user_id;
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;

  INSERT INTO public.notifications (user_id, type, title, message, event_id)
  VALUES (
    NEW.reviewed_user_id,
    'event_review_reminder',
    'Nova avaliação recebida!',
    COALESCE(reviewer_name, 'Alguém') || ' te avaliou no evento "' || COALESCE(event_title, 'evento') || '"',
    NEW.event_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_review_received
  AFTER INSERT ON public.user_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_review_received();

-- 3. Update existing notification triggers to use rate limiting

-- Wrap notify_matching_events with rate limit
CREATE OR REPLACE FUNCTION public.notify_matching_events()
RETURNS trigger
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
      IF user_wants_notification(profile_record.user_id, 'new_event') AND can_send_notification(profile_record.user_id) THEN
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

-- Wrap notify_other_participants with rate limit
CREATE OR REPLACE FUNCTION public.notify_other_participants_on_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    IF user_wants_notification(participant_id, 'participant_joined') AND can_send_notification(participant_id) THEN
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

-- Wrap notify_new_message with rate limit
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
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
    SELECT user_id FROM event_participants 
    WHERE event_id = NEW.event_id AND user_id != NEW.user_id
  LOOP
    IF user_wants_notification(participant_id, 'new_message') AND can_send_notification(participant_id) THEN
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
