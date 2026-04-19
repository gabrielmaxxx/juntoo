-- Atualiza get_public_profile_by_id e get_public_profile_by_username para incluir:
-- 1) último 3 eventos públicos PARTICIPADOS (respeitando privacidade show_events_participated)
-- 2) auth_provider (Google, email) — derivado a partir de auth.users.raw_app_meta_data
-- 3) sinaliza email confirmado (verified_email)

CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_reputation JSON;
  v_achievements JSON;
  v_public_events JSON;
  v_recent_participated JSON;
  v_show_participated BOOLEAN;
  v_auth_provider TEXT;
  v_email_confirmed BOOLEAN;
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

  -- Privacy: show_events_participated (default true)
  SELECT COALESCE(show_events_participated, true) INTO v_show_participated
  FROM privacy_preferences
  WHERE user_id = v_profile.user_id;
  v_show_participated := COALESCE(v_show_participated, true);

  IF v_show_participated THEN
    SELECT COALESCE(json_agg(row_to_json(e) ORDER BY e.date DESC), '[]'::json)
    INTO v_recent_participated
    FROM (
      SELECT ewd.id, ewd.title, ewd.category, ewd.date, ewd.time, ewd.location, ewd.image_url, ewd.city
      FROM events_with_details ewd
      JOIN event_participants ep ON ep.event_id = ewd.id
      WHERE ep.user_id = v_profile.user_id
        AND ewd.is_private = false
        AND ewd.created_by != v_profile.user_id
      ORDER BY ewd.date DESC
      LIMIT 3
    ) e;
  ELSE
    v_recent_participated := '[]'::json;
  END IF;

  -- Auth provider + email confirmed
  SELECT
    CASE
      WHEN raw_app_meta_data->>'provider' = 'google' THEN 'google'
      WHEN raw_app_meta_data->>'provider' = 'email' THEN 'email'
      ELSE COALESCE(raw_app_meta_data->>'provider', 'email')
    END,
    (email_confirmed_at IS NOT NULL)
  INTO v_auth_provider, v_email_confirmed
  FROM auth.users
  WHERE id = v_profile.user_id;

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
    'public_events', v_public_events,
    'recent_participated_events', v_recent_participated,
    'auth_provider', COALESCE(v_auth_provider, 'email'),
    'email_confirmed', COALESCE(v_email_confirmed, false)
  );

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_by_username(p_username text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE username = lower(p_username)
  LIMIT 1;

  IF v_profile IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN get_public_profile_by_id(v_profile.user_id);
END;
$function$;