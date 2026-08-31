-- 1. Structural additions
ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS attendance_status text NOT NULL DEFAULT 'confirmed';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_participants_attendance_status_check') THEN
    ALTER TABLE public.event_participants
      ADD CONSTRAINT event_participants_attendance_status_check
      CHECK (attendance_status IN ('confirmed','attended','no_show'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_participants_attendance ON public.event_participants(user_id, attendance_status);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid;

CREATE INDEX IF NOT EXISTS idx_events_cancelled_at ON public.events(created_by, cancelled_at);

-- 2. Manual override table (only sanctioned path for manual score adjustment)
CREATE TABLE IF NOT EXISTS public.user_trust_score_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  moderator_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_trust_score_overrides TO authenticated;
GRANT ALL ON public.user_trust_score_overrides TO service_role;

ALTER TABLE public.user_trust_score_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Moderators can view all overrides" ON public.user_trust_score_overrides;
CREATE POLICY "Moderators can view all overrides"
ON public.user_trust_score_overrides FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can view their own overrides" ON public.user_trust_score_overrides;
CREATE POLICY "Users can view their own overrides"
ON public.user_trust_score_overrides FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Moderators can create overrides" ON public.user_trust_score_overrides;
CREATE POLICY "Moderators can create overrides"
ON public.user_trust_score_overrides FOR INSERT TO authenticated
WITH CHECK (
  moderator_id = auth.uid()
  AND length(btrim(reason)) >= 5
  AND (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE INDEX IF NOT EXISTS idx_trust_overrides_user ON public.user_trust_score_overrides(user_id);

-- 3. Single official reputation formula
CREATE OR REPLACE FUNCTION public.calculate_reputation_score(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_events_attended int;
  v_events_created int;
  v_reviews_given int;
  v_positive_reviews int;
  v_achievements int;
  v_no_shows int;
  v_late_cancellations int;
  v_confirmed_reports int;
  v_manual int;
  v_positive int;
  v_penalty int;
  v_score int;
BEGIN
  SELECT COUNT(*) INTO v_events_attended
  FROM event_participants ep JOIN events e ON e.id = ep.event_id
  WHERE ep.user_id = p_user_id AND e.is_recurring = false
    AND e.cancelled_at IS NULL
    AND ep.attendance_status <> 'no_show'
    AND (e.date::timestamp + e.time::interval) < now();

  SELECT COUNT(*) INTO v_events_created
  FROM events WHERE created_by = p_user_id;

  SELECT COUNT(*) INTO v_reviews_given
  FROM user_reviews WHERE reviewer_user_id = p_user_id;

  SELECT COUNT(*) INTO v_positive_reviews
  FROM user_reviews WHERE reviewed_user_id = p_user_id AND overall_rating >= 4;

  SELECT COUNT(*) INTO v_achievements
  FROM user_achievements WHERE user_id = p_user_id;

  -- Penalty: no-show after confirming attendance
  SELECT COUNT(*) INTO v_no_shows
  FROM event_participants ep JOIN events e ON e.id = ep.event_id
  WHERE ep.user_id = p_user_id AND ep.attendance_status = 'no_show';

  -- Penalty: organizer cancelled event less than 24h before start
  SELECT COUNT(*) INTO v_late_cancellations
  FROM events e
  WHERE e.created_by = p_user_id
    AND e.cancelled_at IS NOT NULL
    AND e.cancelled_at > ((e.date::timestamp + e.time::interval) - interval '24 hours');

  -- Penalty: report confirmed by moderation
  SELECT COUNT(*) INTO v_confirmed_reports
  FROM reports r
  WHERE r.reported_user_id = p_user_id AND r.status = 'resolved';

  SELECT COALESCE(SUM(delta), 0) INTO v_manual
  FROM user_trust_score_overrides WHERE user_id = p_user_id;

  v_positive :=
    (v_events_attended * 10) +
    (v_events_created * 15) +
    (v_reviews_given * 2) +
    (v_positive_reviews * 5) +
    (v_achievements * 25);

  v_penalty :=
    (v_no_shows * 15) +
    (v_late_cancellations * 30) +
    (v_confirmed_reports * 50);

  v_score := GREATEST(0, LEAST(1000, v_positive - v_penalty + v_manual));

  RETURN json_build_object(
    'score', v_score,
    'events_attended', v_events_attended,
    'events_created', v_events_created,
    'reviews_given', v_reviews_given,
    'positive_reviews', v_positive_reviews,
    'achievements', v_achievements,
    'no_shows', v_no_shows,
    'late_cancellations', v_late_cancellations,
    'confirmed_reports', v_confirmed_reports,
    'manual_adjustment', v_manual,
    'positive_points', v_positive,
    'penalty_points', v_penalty
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.calculate_reputation_score(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_reputation_score(uuid) TO authenticated, service_role;

-- 4. Automatic sync into user_trust_scores (0-100 scale)
CREATE OR REPLACE FUNCTION public.refresh_user_trust_score(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_data json;
  v_new int;
  v_old int;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  v_data := public.calculate_reputation_score(p_user_id);
  v_new := GREATEST(0, LEAST(100, ROUND(((v_data->>'score')::int) / 10.0)::int));

  SELECT score INTO v_old FROM user_trust_scores WHERE user_id = p_user_id;

  INSERT INTO user_trust_scores (user_id, score, updated_at)
  VALUES (p_user_id, v_new, now())
  ON CONFLICT (user_id) DO UPDATE SET score = v_new, updated_at = now();

  IF v_old IS NOT NULL AND v_old <> v_new THEN
    INSERT INTO user_reputation_log (user_id, change_amount, reason)
    VALUES (p_user_id, v_new - v_old, 'Recálculo automático do score consolidado');
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refresh_user_trust_score(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_user_trust_score(uuid) TO authenticated, service_role;

-- 5. Trigger plumbing
CREATE OR REPLACE FUNCTION public.trg_refresh_trust_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_target uuid;
BEGIN
  v_target := CASE TG_TABLE_NAME
    WHEN 'event_participants' THEN COALESCE(NEW.user_id, OLD.user_id)
    WHEN 'events' THEN COALESCE(NEW.created_by, OLD.created_by)
    WHEN 'user_reviews' THEN COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id)
    WHEN 'user_achievements' THEN COALESCE(NEW.user_id, OLD.user_id)
    WHEN 'reports' THEN COALESCE(NEW.reported_user_id, OLD.reported_user_id)
    WHEN 'user_trust_score_overrides' THEN COALESCE(NEW.user_id, OLD.user_id)
  END;

  PERFORM public.refresh_user_trust_score(v_target);

  IF TG_TABLE_NAME = 'user_reviews' THEN
    PERFORM public.refresh_user_trust_score(COALESCE(NEW.reviewer_user_id, OLD.reviewer_user_id));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.trg_refresh_trust_score() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_trust_event_participants ON public.event_participants;
CREATE TRIGGER trg_trust_event_participants
AFTER INSERT OR UPDATE OR DELETE ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

DROP TRIGGER IF EXISTS trg_trust_events ON public.events;
CREATE TRIGGER trg_trust_events
AFTER INSERT OR UPDATE OF cancelled_at, date, time OR DELETE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

DROP TRIGGER IF EXISTS trg_trust_user_reviews ON public.user_reviews;
CREATE TRIGGER trg_trust_user_reviews
AFTER INSERT OR UPDATE OR DELETE ON public.user_reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

DROP TRIGGER IF EXISTS trg_trust_user_achievements ON public.user_achievements;
CREATE TRIGGER trg_trust_user_achievements
AFTER INSERT OR DELETE ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

DROP TRIGGER IF EXISTS trg_trust_reports ON public.reports;
CREATE TRIGGER trg_trust_reports
AFTER UPDATE OF status ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

DROP TRIGGER IF EXISTS trg_trust_overrides ON public.user_trust_score_overrides;
CREATE TRIGGER trg_trust_overrides
AFTER INSERT ON public.user_trust_score_overrides
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_trust_score();

-- 6. apply_penalty no longer writes trust score directly; it recalculates
CREATE OR REPLACE FUNCTION public.apply_penalty(p_user_id uuid, p_moderator_id uuid, p_penalty_type text, p_reason text, p_reputation_impact integer DEFAULT 0, p_duration_days integer DEFAULT NULL::integer, p_blocked_feature text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  penalty_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF p_duration_days IS NOT NULL THEN
    v_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;

  INSERT INTO user_penalties (user_id, moderator_id, penalty_type, reason, reputation_impact, duration_days, blocked_feature, expires_at)
  VALUES (p_user_id, p_moderator_id, p_penalty_type, p_reason, p_reputation_impact, p_duration_days, p_blocked_feature, v_expires_at)
  RETURNING id INTO penalty_id;

  -- Manual reputation impact becomes an auditable override
  IF COALESCE(p_reputation_impact, 0) <> 0 THEN
    INSERT INTO user_trust_score_overrides (user_id, moderator_id, delta, reason)
    VALUES (p_user_id, p_moderator_id, -ABS(p_reputation_impact) * 10, COALESCE(p_reason, 'Penalidade aplicada pela moderação'));

    INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
    VALUES (p_user_id, p_reputation_impact, p_reason, p_moderator_id);
  END IF;

  PERFORM public.refresh_user_trust_score(p_user_id);

  IF p_penalty_type IN ('suspension', 'ban') THEN
    INSERT INTO user_restrictions (user_id, restriction_type, reason, expires_at)
    VALUES (p_user_id, 'restricted', p_reason, v_expires_at);
  END IF;

  IF p_penalty_type = 'feature_block' AND p_blocked_feature IS NOT NULL THEN
    INSERT INTO user_restrictions (user_id, restriction_type, reason, expires_at)
    VALUES (p_user_id, 'feature_block_' || p_blocked_feature, p_reason, v_expires_at);
  END IF;

  RETURN penalty_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.apply_penalty(uuid, uuid, text, text, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_penalty(uuid, uuid, text, text, integer, integer, text) TO authenticated, service_role;