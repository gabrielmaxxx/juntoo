
-- 1. Trust Score table
CREATE TABLE public.user_trust_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 100 CHECK (score >= 0 AND score <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trust score" ON public.user_trust_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Moderators can view all trust scores" ON public.user_trust_scores
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "System can manage trust scores" ON public.user_trust_scores
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- 2. Reputation log table
CREATE TABLE public.user_reputation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_amount integer NOT NULL,
  reason text NOT NULL,
  moderator_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_reputation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view reputation logs" ON public.user_reputation_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Moderators can insert reputation logs" ON public.user_reputation_log
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- 3. Penalties table
CREATE TABLE public.user_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moderator_id uuid NOT NULL,
  penalty_type text NOT NULL CHECK (penalty_type IN ('warning', 'reputation_loss', 'suspension', 'feature_block', 'ban')),
  reason text NOT NULL,
  reputation_impact integer DEFAULT 0,
  duration_days integer,
  blocked_feature text,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view all penalties" ON public.user_penalties
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Moderators can create penalties" ON public.user_penalties
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Moderators can update penalties" ON public.user_penalties
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own penalties" ON public.user_penalties
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. Function to apply penalty and update trust/reputation
CREATE OR REPLACE FUNCTION public.apply_penalty(
  p_user_id uuid,
  p_moderator_id uuid,
  p_penalty_type text,
  p_reason text,
  p_reputation_impact integer DEFAULT 0,
  p_duration_days integer DEFAULT NULL,
  p_blocked_feature text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  penalty_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Calculate expiry
  IF p_duration_days IS NOT NULL THEN
    v_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;

  -- Insert penalty
  INSERT INTO user_penalties (user_id, moderator_id, penalty_type, reason, reputation_impact, duration_days, blocked_feature, expires_at)
  VALUES (p_user_id, p_moderator_id, p_penalty_type, p_reason, p_reputation_impact, p_duration_days, p_blocked_feature, v_expires_at)
  RETURNING id INTO penalty_id;

  -- Update trust score
  INSERT INTO user_trust_scores (user_id, score, updated_at)
  VALUES (p_user_id, GREATEST(0, 100 - ABS(p_reputation_impact)), now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = GREATEST(0, user_trust_scores.score - ABS(p_reputation_impact)),
    updated_at = now();

  -- Log reputation change
  IF p_reputation_impact != 0 THEN
    INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
    VALUES (p_user_id, p_reputation_impact, p_reason, p_moderator_id);
  END IF;

  -- If suspension or ban, create restriction
  IF p_penalty_type IN ('suspension', 'ban') THEN
    INSERT INTO user_restrictions (user_id, restriction_type, reason, expires_at)
    VALUES (p_user_id, 'restricted', p_reason, v_expires_at);
  END IF;

  -- If feature_block, create specific restriction
  IF p_penalty_type = 'feature_block' AND p_blocked_feature IS NOT NULL THEN
    INSERT INTO user_restrictions (user_id, restriction_type, reason, expires_at)
    VALUES (p_user_id, 'feature_block_' || p_blocked_feature, p_reason, v_expires_at);
  END IF;

  RETURN penalty_id;
END;
$$;

-- 5. Function to get moderation stats
CREATE OR REPLACE FUNCTION public.get_moderation_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'reports_today', (SELECT COUNT(*) FROM reports WHERE created_at > now() - interval '1 day'),
    'reports_week', (SELECT COUNT(*) FROM reports WHERE created_at > now() - interval '7 days'),
    'reports_resolved', (SELECT COUNT(*) FROM reports WHERE status = 'resolved'),
    'reports_pending', (SELECT COUNT(*) FROM reports WHERE status = 'created'),
    'users_suspended', (SELECT COUNT(DISTINCT user_id) FROM user_penalties WHERE penalty_type IN ('suspension', 'ban') AND is_active = true AND (expires_at IS NULL OR expires_at > now())),
    'penalties_total', (SELECT COUNT(*) FROM user_penalties),
    'penalties_week', (SELECT COUNT(*) FROM user_penalties WHERE created_at > now() - interval '7 days'),
    'avg_resolution_hours', (SELECT COALESCE(ROUND(EXTRACT(EPOCH FROM AVG(reviewed_at - created_at)) / 3600, 1), 0) FROM reports WHERE reviewed_at IS NOT NULL)
  ) INTO result;
  RETURN result;
END;
$$;

-- 6. Function to get reported users grouped
CREATE OR REPLACE FUNCTION public.get_reported_users()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT 
      r.reported_user_id as user_id,
      p.full_name,
      p.avatar_url,
      COUNT(r.id) as report_count,
      COUNT(r.id) FILTER (WHERE r.status = 'created') as pending_count,
      COALESCE(ts.score, 100) as trust_score,
      COALESCE((SELECT json_build_object(
        'average_overall', ROUND(AVG(ur.overall_rating), 1),
        'total_reviews', COUNT(ur.id)
      ) FROM user_reviews ur WHERE ur.reviewed_user_id = r.reported_user_id), '{"average_overall": 0, "total_reviews": 0}'::json) as reputation,
      EXISTS(SELECT 1 FROM user_penalties up WHERE up.user_id = r.reported_user_id AND up.penalty_type IN ('suspension', 'ban') AND up.is_active = true AND (up.expires_at IS NULL OR up.expires_at > now())) as is_suspended
    FROM reports r
    JOIN profiles p ON p.user_id = r.reported_user_id
    LEFT JOIN user_trust_scores ts ON ts.user_id = r.reported_user_id
    WHERE r.reported_user_id IS NOT NULL
    GROUP BY r.reported_user_id, p.full_name, p.avatar_url, ts.score
    ORDER BY COUNT(r.id) DESC
  ) t;
  RETURN result;
END;
$$;
