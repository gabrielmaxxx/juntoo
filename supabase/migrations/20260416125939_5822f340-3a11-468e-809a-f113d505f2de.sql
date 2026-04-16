
-- Table for persistent achievement badges
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all achievements" ON public.user_achievements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert achievements" ON public.user_achievements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function to calculate reputation score (0-1000)
CREATE OR REPLACE FUNCTION public.calculate_reputation_score(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_events_attended int;
  v_events_created int;
  v_reviews_given int;
  v_positive_reviews int;
  v_achievements int;
  v_score int;
BEGIN
  SELECT COUNT(*) INTO v_events_attended
  FROM event_participants ep JOIN events e ON e.id = ep.event_id
  WHERE ep.user_id = p_user_id AND e.is_recurring = false
    AND (e.date::timestamp + e.time::interval) < now();

  SELECT COUNT(*) INTO v_events_created
  FROM events WHERE created_by = p_user_id;

  SELECT COUNT(*) INTO v_reviews_given
  FROM user_reviews WHERE reviewer_user_id = p_user_id;

  SELECT COUNT(*) INTO v_positive_reviews
  FROM user_reviews WHERE reviewed_user_id = p_user_id AND overall_rating >= 4;

  SELECT COUNT(*) INTO v_achievements
  FROM user_achievements WHERE user_id = p_user_id;

  v_score := LEAST(1000,
    (v_events_attended * 10) +
    (v_events_created * 15) +
    (v_reviews_given * 2) +
    (v_positive_reviews * 5) +
    (v_achievements * 25)
  );

  RETURN json_build_object(
    'score', v_score,
    'events_attended', v_events_attended,
    'events_created', v_events_created,
    'reviews_given', v_reviews_given,
    'positive_reviews', v_positive_reviews,
    'achievements', v_achievements
  );
END;
$$;

-- Function to check and grant achievements
CREATE OR REPLACE FUNCTION public.check_and_grant_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_events_attended int;
  v_events_created int;
  v_positive_reviews int;
  v_categories int;
  v_consecutive_weeks int;
BEGIN
  -- Count completed events
  SELECT COUNT(*) INTO v_events_attended
  FROM event_participants ep JOIN events e ON e.id = ep.event_id
  WHERE ep.user_id = p_user_id AND e.is_recurring = false
    AND (e.date::timestamp + e.time::interval) < now();

  SELECT COUNT(*) INTO v_events_created
  FROM events WHERE created_by = p_user_id;

  SELECT COUNT(*) INTO v_positive_reviews
  FROM user_reviews WHERE reviewed_user_id = p_user_id AND overall_rating >= 4;

  SELECT COUNT(DISTINCT e.category) INTO v_categories
  FROM event_participants ep JOIN events e ON e.id = ep.event_id
  WHERE ep.user_id = p_user_id;

  -- Calculate consecutive weeks
  WITH weekly AS (
    SELECT DISTINCT date_trunc('week', ep.joined_at) as week
    FROM event_participants ep
    WHERE ep.user_id = p_user_id
    ORDER BY week DESC
  ), numbered AS (
    SELECT week, ROW_NUMBER() OVER (ORDER BY week DESC) as rn
    FROM weekly
  ), gaps AS (
    SELECT week, rn, week - (rn * interval '1 week') as grp
    FROM numbered
  )
  SELECT COALESCE(MAX(cnt), 0) INTO v_consecutive_weeks
  FROM (SELECT COUNT(*) as cnt FROM gaps GROUP BY grp) sub;

  -- Grant badges
  IF v_events_attended >= 1 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'primeiro_passo') ON CONFLICT DO NOTHING;
  END IF;
  IF v_events_attended >= 10 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'social_butterfly') ON CONFLICT DO NOTHING;
  END IF;
  IF v_events_created >= 5 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'organizador') ON CONFLICT DO NOTHING;
  END IF;
  IF v_positive_reviews >= 20 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'confiavel') ON CONFLICT DO NOTHING;
  END IF;
  IF v_categories >= 5 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'explorador') ON CONFLICT DO NOTHING;
  END IF;
  IF v_consecutive_weeks >= 4 THEN
    INSERT INTO user_achievements (user_id, badge_id) VALUES (p_user_id, 'frequentador') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
