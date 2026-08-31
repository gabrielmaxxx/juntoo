-- Restrict internal recalculation helpers to the backend only
REVOKE EXECUTE ON FUNCTION public.refresh_user_trust_score(uuid) FROM authenticated;

-- 0. Fix trigger dispatcher: per-table blocks (a CASE expression resolves every branch)
CREATE OR REPLACE FUNCTION public.trg_refresh_trust_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_target uuid;
BEGIN
  IF TG_TABLE_NAME = 'event_participants' THEN
    v_target := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'events' THEN
    v_target := COALESCE(NEW.created_by, OLD.created_by);
  ELSIF TG_TABLE_NAME = 'user_reviews' THEN
    v_target := COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
    PERFORM public.refresh_user_trust_score(COALESCE(NEW.reviewer_user_id, OLD.reviewer_user_id));
  ELSIF TG_TABLE_NAME = 'user_achievements' THEN
    v_target := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'reports' THEN
    v_target := COALESCE(NEW.reported_user_id, OLD.reported_user_id);
  ELSIF TG_TABLE_NAME = 'user_trust_score_overrides' THEN
    v_target := COALESCE(NEW.user_id, OLD.user_id);
  END IF;

  PERFORM public.refresh_user_trust_score(v_target);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.trg_refresh_trust_score() FROM PUBLIC;

-- 1. Snapshot current scores for audit / rollback
CREATE TABLE IF NOT EXISTS public.user_trust_scores_backup_2026_08 (
  user_id uuid PRIMARY KEY,
  score integer NOT NULL,
  updated_at timestamptz NOT NULL,
  snapshotted_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.user_trust_scores_backup_2026_08 TO service_role;
GRANT SELECT ON public.user_trust_scores_backup_2026_08 TO authenticated;
ALTER TABLE public.user_trust_scores_backup_2026_08 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view score backup" ON public.user_trust_scores_backup_2026_08;
CREATE POLICY "Admins can view score backup"
ON public.user_trust_scores_backup_2026_08 FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.user_trust_scores_backup_2026_08 (user_id, score, updated_at)
SELECT user_id, score, updated_at FROM public.user_trust_scores
ON CONFLICT (user_id) DO NOTHING;

-- 2. Preserve pre-existing manual adjustments as auditable overrides
DO $$
DECLARE
  r record;
  v_auto int;
  v_delta int;
  v_mod uuid;
BEGIN
  FOR r IN SELECT user_id, score FROM public.user_trust_scores_backup_2026_08 LOOP
    v_auto := GREATEST(0, LEAST(100, ROUND((((public.calculate_reputation_score(r.user_id))->>'score')::int) / 10.0)::int));
    v_delta := (r.score - v_auto) * 10;

    IF v_delta <> 0 THEN
      SELECT moderator_id INTO v_mod
      FROM public.user_reputation_log
      WHERE user_id = r.user_id AND moderator_id IS NOT NULL
      ORDER BY created_at DESC LIMIT 1;

      INSERT INTO public.user_trust_score_overrides (user_id, moderator_id, delta, reason)
      VALUES (r.user_id, COALESCE(v_mod, r.user_id), v_delta, 'Migração: ajuste manual anterior preservado');
    END IF;
  END LOOP;
END $$;

-- 3. Recalculate everyone with the new consolidated formula
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.profiles LOOP
    PERFORM public.refresh_user_trust_score(r.user_id);
  END LOOP;
END $$;