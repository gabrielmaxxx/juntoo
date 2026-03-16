
-- Add a trigger to notify users when a penalty is applied
CREATE OR REPLACE FUNCTION public.notify_user_penalty()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  penalty_label TEXT;
  msg TEXT;
BEGIN
  -- Map penalty types to Portuguese labels
  CASE NEW.penalty_type
    WHEN 'warning' THEN penalty_label := 'Advertência';
    WHEN 'reputation_loss' THEN penalty_label := 'Redução de reputação';
    WHEN 'suspension' THEN penalty_label := 'Suspensão de conta';
    WHEN 'feature_block' THEN penalty_label := 'Bloqueio de função';
    WHEN 'ban' THEN penalty_label := 'Banimento';
    ELSE penalty_label := NEW.penalty_type;
  END CASE;

  IF NEW.duration_days IS NOT NULL THEN
    msg := penalty_label || ' aplicada por ' || NEW.duration_days || ' dia(s). Motivo: ' || NEW.reason;
  ELSE
    msg := penalty_label || ' aplicada. Motivo: ' || NEW.reason;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    NEW.user_id,
    'penalty_applied',
    'Ação disciplinar aplicada',
    msg
  );

  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER on_penalty_applied
  AFTER INSERT ON public.user_penalties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_penalty();

-- Also notify when a penalty is revoked
CREATE OR REPLACE FUNCTION public.notify_user_penalty_revoked()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only fire when is_active changes from true to false
  IF OLD.is_active = true AND NEW.is_active = false THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'penalty_revoked',
      'Ação disciplinar revogada',
      'Uma punição foi revogada. Motivo original: ' || NEW.reason
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_penalty_revoked
  AFTER UPDATE ON public.user_penalties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_penalty_revoked();

-- Update the notifications type check to allow new types
-- First check if constraint exists and drop it
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Re-add with new types included
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'event_join', 'event_updated', 'event_reminder', 'event_reminder_1h',
    'new_event', 'new_message', 'friend_request', 'friend_request_accepted',
    'participant_joined', 'event_review', 'verification_approved', 'verification_rejected',
    'penalty_applied', 'penalty_revoked'
  ));
