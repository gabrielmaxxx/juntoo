
-- Fix approve_user_verification: insert score 100 instead of 105
CREATE OR REPLACE FUNCTION public.approve_user_verification(p_verification_id uuid, p_moderator_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE user_verifications
  SET status = 'approved', reviewed_by = p_moderator_id, reviewed_at = now()
  WHERE id = p_verification_id AND status = 'pending'
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verification not found or already reviewed';
  END IF;

  UPDATE profiles SET verified = true, verification_level = 1 WHERE user_id = v_user_id;

  INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
  VALUES (v_user_id, 5, 'Verificação de identidade aprovada', p_moderator_id);

  INSERT INTO user_trust_scores (user_id, score, updated_at)
  VALUES (v_user_id, 100, now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = LEAST(100, user_trust_scores.score + 5),
    updated_at = now();
END;
$$;

-- Fix approve_business_verification: insert score 100 instead of 105
CREATE OR REPLACE FUNCTION public.approve_business_verification(p_verification_id uuid, p_moderator_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE business_verifications
  SET status = 'approved', reviewed_by = p_moderator_id, reviewed_at = now()
  WHERE id = p_verification_id AND status = 'pending'
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verification not found or already reviewed';
  END IF;

  UPDATE profiles SET business_verified = true, verification_level = 2 WHERE user_id = v_user_id;

  INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
  VALUES (v_user_id, 5, 'Verificação empresarial aprovada', p_moderator_id);

  INSERT INTO user_trust_scores (user_id, score, updated_at)
  VALUES (v_user_id, 100, now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = LEAST(100, user_trust_scores.score + 5),
    updated_at = now();
END;
$$;
