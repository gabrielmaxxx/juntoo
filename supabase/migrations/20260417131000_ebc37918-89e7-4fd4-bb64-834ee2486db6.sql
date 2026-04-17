-- Add username column to profiles
ALTER TABLE public.profiles
ADD COLUMN username TEXT UNIQUE;

-- Validation: lowercase, alphanumeric + underscore, 3-30 chars
ALTER TABLE public.profiles
ADD CONSTRAINT username_format CHECK (
  username IS NULL OR (
    username ~ '^[a-z0-9_]{3,30}$'
  )
);

-- Index for faster lookup
CREATE INDEX idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

-- Allow anonymous (public) access to public profiles for shareable links
CREATE POLICY "Public profiles are viewable by anyone"
ON public.profiles
FOR SELECT
TO anon
USING (is_profile_public(user_id));

-- Function to get public profile data by username (works without auth)
CREATE OR REPLACE FUNCTION public.get_public_profile_by_username(p_username TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_reputation JSON;
  v_achievements JSON;
  v_public_events JSON;
  v_result JSON;
BEGIN
  -- Find profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE username = lower(p_username)
  LIMIT 1;

  IF v_profile IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check privacy
  IF NOT is_profile_public(v_profile.user_id) THEN
    RETURN json_build_object('private', true, 'full_name', v_profile.full_name);
  END IF;

  -- Get reputation
  v_reputation := calculate_reputation_score(v_profile.user_id);

  -- Get achievements
  SELECT COALESCE(json_agg(json_build_object('badge_id', badge_id, 'unlocked_at', unlocked_at)), '[]'::json)
  INTO v_achievements
  FROM user_achievements
  WHERE user_id = v_profile.user_id;

  -- Get public events created by this user (future + recent)
  SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json)
  INTO v_public_events
  FROM (
    SELECT id, title, category, date, time, location, image_url, city
    FROM events_with_details
    WHERE created_by = v_profile.user_id
      AND is_private = false
      AND date >= CURRENT_DATE - interval '30 days'
    ORDER BY date DESC
    LIMIT 6
  ) e;

  v_result := json_build_object(
    'user_id', v_profile.user_id,
    'username', v_profile.username,
    'full_name', v_profile.full_name,
    'avatar_url', v_profile.avatar_url,
    'bio', v_profile.bio,
    'city', v_profile.city,
    'interests', v_profile.interests,
    'verified', v_profile.verified,
    'business_verified', v_profile.business_verified,
    'created_at', v_profile.created_at,
    'reputation', v_reputation,
    'achievements', v_achievements,
    'public_events', v_public_events
  );

  RETURN v_result;
END;
$$;

-- Allow anonymous and authenticated to call this function
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(TEXT) TO anon, authenticated;

-- Same function but by user_id (fallback when no username set)
CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_reputation JSON;
  v_achievements JSON;
  v_public_events JSON;
  v_result JSON;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id LIMIT 1;

  IF v_profile IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT is_profile_public(v_profile.user_id) THEN
    RETURN json_build_object('private', true, 'full_name', v_profile.full_name);
  END IF;

  v_reputation := calculate_reputation_score(v_profile.user_id);

  SELECT COALESCE(json_agg(json_build_object('badge_id', badge_id, 'unlocked_at', unlocked_at)), '[]'::json)
  INTO v_achievements
  FROM user_achievements
  WHERE user_id = v_profile.user_id;

  SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json)
  INTO v_public_events
  FROM (
    SELECT id, title, category, date, time, location, image_url, city
    FROM events_with_details
    WHERE created_by = v_profile.user_id
      AND is_private = false
      AND date >= CURRENT_DATE - interval '30 days'
    ORDER BY date DESC
    LIMIT 6
  ) e;

  v_result := json_build_object(
    'user_id', v_profile.user_id,
    'username', v_profile.username,
    'full_name', v_profile.full_name,
    'avatar_url', v_profile.avatar_url,
    'bio', v_profile.bio,
    'city', v_profile.city,
    'interests', v_profile.interests,
    'verified', v_profile.verified,
    'business_verified', v_profile.business_verified,
    'created_at', v_profile.created_at,
    'reputation', v_reputation,
    'achievements', v_achievements,
    'public_events', v_public_events
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_by_id(UUID) TO anon, authenticated;