ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.enforce_minimum_age()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_age integer;
BEGIN
  IF NEW.birth_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.birth_date IS NOT DISTINCT FROM NEW.birth_date THEN
    RETURN NEW;
  END IF;

  v_age := date_part('year', age(NEW.birth_date))::int;

  IF v_age < 18 THEN
    NEW.suspended_reason := 'idade_nao_confirmada';
    NEW.suspended_at := now();

    INSERT INTO public.moderation_logs (admin_id, action, target_type, target_id, reason, metadata)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'auto_suspend_underage',
      'user',
      NEW.user_id::text,
      'Data de nascimento informada indica idade inferior a 18 anos',
      jsonb_build_object('birth_date', NEW.birth_date, 'calculated_age', v_age, 'protocol', 'capitulo_12')
    );
  ELSIF NEW.suspended_reason = 'idade_nao_confirmada' THEN
    NEW.suspended_reason := NULL;
    NEW.suspended_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_minimum_age ON public.profiles;
CREATE TRIGGER trg_enforce_minimum_age
BEFORE INSERT OR UPDATE OF birth_date ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_minimum_age();