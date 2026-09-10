-- 1. Remove duplicate new-event notification trigger (users received duplicates)
DROP TRIGGER IF EXISTS trigger_notify_matching_events ON public.events;

-- 2. New-user event limit: only count parent events, use Sao Paulo local day, clearer message
CREATE OR REPLACE FUNCTION public.enforce_new_user_event_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_created_at timestamptz;
  v_events_today integer;
  v_limit integer := 2;
BEGIN
  -- Recurring child events are part of a single creation action: never rate limited
  IF NEW.parent_event_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT created_at INTO v_profile_created_at
  FROM public.profiles
  WHERE user_id = NEW.created_by;

  IF v_profile_created_at IS NOT NULL
     AND v_profile_created_at > now() - interval '24 hours' THEN
    SELECT COUNT(*) INTO v_events_today
    FROM public.events
    WHERE created_by = NEW.created_by
      AND parent_event_id IS NULL
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date
          = (now() AT TIME ZONE 'America/Sao_Paulo')::date;

    IF v_events_today >= v_limit THEN
      RAISE EXCEPTION 'NEW_USER_EVENT_LIMIT: Contas criadas nas últimas 24 horas podem publicar até % eventos por dia. Tente novamente amanhã.', v_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Friendlier, machine-detectable messages for capacity and message limits
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count integer;
  max_cap integer;
BEGIN
  SELECT max_participants INTO max_cap FROM events WHERE id = NEW.event_id;
  IF max_cap IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM event_participants WHERE event_id = NEW.event_id;

  IF current_count >= max_cap THEN
    RAISE EXCEPTION 'EVENT_FULL: Este evento já atingiu o número máximo de participantes (%).', max_cap;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_new_user_message_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_created_at timestamptz;
  v_messages_last_hour integer;
BEGIN
  SELECT created_at INTO v_profile_created_at
  FROM public.profiles WHERE user_id = NEW.user_id;

  IF v_profile_created_at IS NOT NULL
     AND v_profile_created_at > now() - interval '24 hours' THEN
    SELECT COUNT(*) INTO v_messages_last_hour
    FROM public.event_messages
    WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour';

    IF v_messages_last_hour >= 20 THEN
      RAISE EXCEPTION 'NEW_USER_MESSAGE_LIMIT: Contas novas podem enviar até 20 mensagens por hora. Tente novamente mais tarde.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;