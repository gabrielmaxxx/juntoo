
-- Create revoke_penalty function that reverses all impact
CREATE OR REPLACE FUNCTION public.revoke_penalty(p_penalty_id uuid, p_moderator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_penalty RECORD;
BEGIN
  -- Get penalty details
  SELECT * INTO v_penalty FROM user_penalties WHERE id = p_penalty_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Penalty not found or already revoked';
  END IF;

  -- Mark penalty as inactive
  UPDATE user_penalties SET is_active = false WHERE id = p_penalty_id;

  -- Reverse trust score impact
  IF v_penalty.reputation_impact != 0 THEN
    UPDATE user_trust_scores 
    SET score = LEAST(100, score + ABS(v_penalty.reputation_impact)), updated_at = now()
    WHERE user_id = v_penalty.user_id;

    -- Log the reversal
    INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
    VALUES (v_penalty.user_id, ABS(v_penalty.reputation_impact), 'Punição revogada: ' || v_penalty.reason, p_moderator_id);
  END IF;

  -- Remove related restrictions
  IF v_penalty.penalty_type IN ('suspension', 'ban') THEN
    UPDATE user_restrictions SET is_active = false
    WHERE user_id = v_penalty.user_id AND restriction_type = 'restricted' AND is_active = true;
  END IF;

  IF v_penalty.penalty_type = 'feature_block' AND v_penalty.blocked_feature IS NOT NULL THEN
    UPDATE user_restrictions SET is_active = false
    WHERE user_id = v_penalty.user_id AND restriction_type = 'feature_block_' || v_penalty.blocked_feature AND is_active = true;
  END IF;
END;
$$;

-- Create a function to check if user is banned/suspended (callable from client)
CREATE OR REPLACE FUNCTION public.get_user_restrictions(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) INTO result
  FROM (
    SELECT restriction_type, reason, expires_at
    FROM user_restrictions
    WHERE user_id = p_user_id 
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at DESC
  ) r;
  RETURN result;
END;
$$;
