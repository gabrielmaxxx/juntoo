CREATE OR REPLACE FUNCTION public.enforce_new_user_event_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_created_at timestamptz;
  v_events_today integer;
BEGIN
  SELECT created_at INTO v_profile_created_at
  FROM public.profiles
  WHERE user_id = NEW.created_by;

  IF v_profile_created_at IS NOT NULL
     AND v_profile_created_at > now() - interval '24 hours' THEN
    SELECT COUNT(*) INTO v_events_today
    FROM public.events
    WHERE created_by = NEW.created_by
      AND created_at >= date_trunc('day', now())
      AND (parent_event_id IS NULL OR parent_event_id = NEW.parent_event_id);

    IF v_events_today >= 1 THEN
      RAISE EXCEPTION 'Contas novas podem criar apenas 1 evento por dia.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_new_user_event_limit_trigger ON public.events;
CREATE TRIGGER enforce_new_user_event_limit_trigger
BEFORE INSERT ON public.events
FOR EACH ROW
WHEN (NEW.parent_event_id IS NULL)
EXECUTE FUNCTION public.enforce_new_user_event_limit();

CREATE OR REPLACE FUNCTION public.enforce_new_user_message_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_created_at timestamptz;
  v_messages_last_hour integer;
BEGIN
  SELECT created_at INTO v_profile_created_at
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF v_profile_created_at IS NOT NULL
     AND v_profile_created_at > now() - interval '24 hours' THEN
    SELECT COUNT(*) INTO v_messages_last_hour
    FROM public.event_messages
    WHERE user_id = NEW.user_id
      AND created_at > now() - interval '1 hour';

    IF v_messages_last_hour >= 20 THEN
      RAISE EXCEPTION 'Contas novas podem enviar no máximo 20 mensagens por hora.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_new_user_message_limit_trigger ON public.event_messages;
CREATE TRIGGER enforce_new_user_message_limit_trigger
BEFORE INSERT ON public.event_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_new_user_message_limit();