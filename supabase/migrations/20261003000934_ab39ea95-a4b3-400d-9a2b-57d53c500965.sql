-- ===== Helpers =====
CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('admin','moderator','super_admin'))
$$;

-- true when the write comes from server code (service role, definer functions, triggers as owner) or staff
CREATE OR REPLACE FUNCTION public.is_privileged_write()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_setting('role', true) NOT IN ('authenticated','anon')
      OR auth.uid() IS NULL
      OR public.is_staff(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_user_blocked(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND suspended_reason IS NOT NULL)
      OR EXISTS (SELECT 1 FROM public.user_restrictions WHERE user_id = _uid AND is_active
                 AND restriction_type = 'restricted' AND (expires_at IS NULL OR expires_at > now()))
$$;

REVOKE EXECUTE ON FUNCTION public.is_privileged_write() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid), public.is_user_blocked(uuid), public.is_privileged_write() TO authenticated;

-- ===== F01 / F24: privileged moderation functions =====
CREATE OR REPLACE FUNCTION public.apply_penalty(p_user_id uuid, p_moderator_id uuid, p_penalty_type text, p_reason text, p_reputation_impact integer DEFAULT 0, p_duration_days integer DEFAULT NULL, p_blocked_feature text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  penalty_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Permissão negada' USING ERRCODE = '42501'; END IF;
    p_moderator_id := auth.uid();
  END IF;
  IF p_duration_days IS NOT NULL THEN
    v_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;
  INSERT INTO user_penalties (user_id, moderator_id, penalty_type, reason, reputation_impact, duration_days, blocked_feature, expires_at)
  VALUES (p_user_id, p_moderator_id, p_penalty_type, p_reason, p_reputation_impact, p_duration_days, p_blocked_feature, v_expires_at)
  RETURNING id INTO penalty_id;
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
  INSERT INTO moderation_logs (admin_id, action, target_type, target_id, reason)
  VALUES (p_moderator_id, 'apply_penalty:' || p_penalty_type, 'user', p_user_id::text, p_reason);
  RETURN penalty_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_penalty(p_penalty_id uuid, p_moderator_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_penalty RECORD;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Permissão negada' USING ERRCODE = '42501'; END IF;
    p_moderator_id := auth.uid();
  END IF;
  SELECT * INTO v_penalty FROM user_penalties WHERE id = p_penalty_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Penalty not found or already revoked'; END IF;
  UPDATE user_penalties SET is_active = false WHERE id = p_penalty_id;
  IF COALESCE(v_penalty.reputation_impact, 0) != 0 THEN
    INSERT INTO user_trust_score_overrides (user_id, moderator_id, delta, reason)
    VALUES (v_penalty.user_id, p_moderator_id, ABS(v_penalty.reputation_impact) * 10, 'Punição revogada: ' || v_penalty.reason);
    INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
    VALUES (v_penalty.user_id, ABS(v_penalty.reputation_impact), 'Punição revogada: ' || v_penalty.reason, p_moderator_id);
    PERFORM public.refresh_user_trust_score(v_penalty.user_id);
  END IF;
  IF v_penalty.penalty_type IN ('suspension', 'ban') THEN
    UPDATE user_restrictions SET is_active = false
    WHERE user_id = v_penalty.user_id AND restriction_type = 'restricted' AND is_active = true;
  END IF;
  IF v_penalty.penalty_type = 'feature_block' AND v_penalty.blocked_feature IS NOT NULL THEN
    UPDATE user_restrictions SET is_active = false
    WHERE user_id = v_penalty.user_id AND restriction_type = 'feature_block_' || v_penalty.blocked_feature AND is_active = true;
  END IF;
  INSERT INTO moderation_logs (admin_id, action, target_type, target_id, reason)
  VALUES (p_moderator_id, 'revoke_penalty', 'user', v_penalty.user_id::text, v_penalty.reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_user_verification(p_verification_id uuid, p_moderator_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Permissão negada' USING ERRCODE = '42501'; END IF;
    p_moderator_id := auth.uid();
  END IF;
  UPDATE user_verifications SET status = 'approved', reviewed_by = p_moderator_id, reviewed_at = now()
  WHERE id = p_verification_id AND status = 'pending' RETURNING user_id INTO v_user_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Verification not found or already reviewed'; END IF;
  UPDATE profiles SET verified = true, verification_level = GREATEST(verification_level, 1) WHERE user_id = v_user_id;
  INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
  VALUES (v_user_id, 5, 'Verificação de identidade aprovada', p_moderator_id);
  PERFORM public.refresh_user_trust_score(v_user_id);
  INSERT INTO moderation_logs (admin_id, action, target_type, target_id) VALUES (p_moderator_id, 'approve_user_verification', 'user', v_user_id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_business_verification(p_verification_id uuid, p_moderator_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Permissão negada' USING ERRCODE = '42501'; END IF;
    p_moderator_id := auth.uid();
  END IF;
  UPDATE business_verifications SET status = 'approved', reviewed_by = p_moderator_id, reviewed_at = now()
  WHERE id = p_verification_id AND status = 'pending' RETURNING user_id INTO v_user_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Verification not found or already reviewed'; END IF;
  UPDATE profiles SET business_verified = true, verification_level = 2 WHERE user_id = v_user_id;
  INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
  VALUES (v_user_id, 5, 'Verificação empresarial aprovada', p_moderator_id);
  PERFORM public.refresh_user_trust_score(v_user_id);
  INSERT INTO moderation_logs (admin_id, action, target_type, target_id) VALUES (p_moderator_id, 'approve_business_verification', 'user', v_user_id::text);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_penalty(uuid,uuid,text,text,integer,integer,text), public.revoke_penalty(uuid,uuid),
  public.approve_user_verification(uuid,uuid), public.approve_business_verification(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_penalty(uuid,uuid,text,text,integer,integer,text), public.revoke_penalty(uuid,uuid),
  public.approve_user_verification(uuid,uuid), public.approve_business_verification(uuid,uuid) TO authenticated;

-- ===== F02 / F15: protected profile fields =====
CREATE OR REPLACE FUNCTION public.guard_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_write() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false; NEW.verification_level := 0; NEW.business_verified := false;
    NEW.suspended_reason := NULL; NEW.suspended_at := NULL;
  ELSE
    NEW.verified := OLD.verified; NEW.verification_level := OLD.verification_level;
    NEW.business_verified := OLD.business_verified; NEW.user_number := OLD.user_number;
    NEW.account_type := OLD.account_type; NEW.user_id := OLD.user_id;
    NEW.suspended_reason := OLD.suspended_reason; NEW.suspended_at := OLD.suspended_at;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_profile_fields ON public.profiles;
-- name starts with "a_" so it runs before trg_enforce_minimum_age (which may legitimately suspend)
CREATE TRIGGER a_guard_profile_fields BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_fields();

-- ===== F20: event featured flag =====
CREATE OR REPLACE FUNCTION public.guard_event_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_write() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_featured := false;
  ELSE
    NEW.is_featured := OLD.is_featured; NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_event_fields ON public.events;
CREATE TRIGGER a_guard_event_fields BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_fields();

-- ===== F13: reports =====
CREATE OR REPLACE FUNCTION public.guard_report_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_write() THEN RETURN NEW; END IF;
  NEW.status := 'created'; NEW.reviewed_at := NULL; NEW.reviewed_by := NULL; NEW.reviewer_notes := NULL;
  NEW.created_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_report_insert ON public.reports;
CREATE TRIGGER a_guard_report_insert BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_insert();

-- ===== F14: verification requests =====
CREATE OR REPLACE FUNCTION public.guard_verification_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_write() THEN RETURN NEW; END IF;
  NEW.status := 'pending'; NEW.reviewed_at := NULL; NEW.reviewed_by := NULL; NEW.reviewer_notes := NULL;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_verification_insert ON public.user_verifications;
CREATE TRIGGER a_guard_verification_insert BEFORE INSERT ON public.user_verifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_verification_insert();
DROP TRIGGER IF EXISTS a_guard_verification_insert ON public.business_verifications;
CREATE TRIGGER a_guard_verification_insert BEFORE INSERT ON public.business_verifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_verification_insert();

-- ===== F21: marketplace orders =====
CREATE OR REPLACE FUNCTION public.guard_marketplace_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_write() THEN RETURN NEW; END IF;
  NEW.status := 'aguardando_pagamento'; NEW.paid_at := NULL; NEW.cancelled_at := NULL;
  NEW.gateway_charge_id := NULL; NEW.gateway := 'nao_definido';
  SELECT organizer_id INTO NEW.organizer_id FROM public.marketplace_products WHERE id = NEW.product_id AND status = 'publicado';
  IF NEW.organizer_id IS NULL THEN RAISE EXCEPTION 'Produto indisponível'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_marketplace_order_insert ON public.marketplace_orders;
CREATE TRIGGER a_guard_marketplace_order_insert BEFORE INSERT ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_order_insert();

-- ===== F15: suspended accounts blocked at DB level =====
DROP POLICY IF EXISTS "Blocked users cannot create events" ON public.events;
CREATE POLICY "Blocked users cannot create events" ON public.events AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "Blocked users cannot join events" ON public.event_participants;
CREATE POLICY "Blocked users cannot join events" ON public.event_participants AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "Blocked users cannot send event messages" ON public.event_messages;
CREATE POLICY "Blocked users cannot send event messages" ON public.event_messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "Blocked users cannot send direct messages" ON public.direct_messages;
CREATE POLICY "Blocked users cannot send direct messages" ON public.direct_messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));
DROP POLICY IF EXISTS "Blocked users cannot send community messages" ON public.community_messages;
CREATE POLICY "Blocked users cannot send community messages" ON public.community_messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_user_blocked(auth.uid()));

-- ===== F03: private events require invite code =====
DROP POLICY IF EXISTS "Private events require invite" ON public.event_participants;
CREATE POLICY "Private events require invite" ON public.event_participants AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id
                      AND (COALESCE(e.is_private,false) = false OR e.created_by = auth.uid())));

CREATE OR REPLACE FUNCTION public.join_private_event(p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event_id uuid; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '42501'; END IF;
  IF public.is_user_blocked(v_uid) THEN RAISE EXCEPTION 'Sua conta está restrita' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_event_id FROM public.events
   WHERE private_code = p_code AND is_private = true AND cancelled_at IS NULL;
  IF v_event_id IS NULL THEN RAISE EXCEPTION 'Convite inválido'; END IF;
  INSERT INTO public.event_participants (event_id, user_id) VALUES (v_event_id, v_uid)
  ON CONFLICT DO NOTHING;
  RETURN v_event_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.join_private_event(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_private_event(text) TO authenticated;

-- ===== F04 / F06: conversations only via function, honoring DM preferences =====
DROP POLICY IF EXISTS "Users can add participants via function" ON public.conversation_participants;

CREATE OR REPLACE FUNCTION public.find_or_create_conversation(other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  conv_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '42501'; END IF;
  IF other_user_id IS NULL OR other_user_id = current_user_id THEN RAISE EXCEPTION 'Conversa inválida'; END IF;
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id AND cp2.user_id = other_user_id
  LIMIT 1;
  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  IF public.is_user_blocked(current_user_id) THEN RAISE EXCEPTION 'Sua conta está restrita' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM privacy_preferences WHERE user_id = other_user_id AND allow_direct_messages = false)
     AND NOT EXISTS (SELECT 1 FROM friendships WHERE status = 'accepted'
                     AND ((user_id = current_user_id AND friend_id = other_user_id) OR (user_id = other_user_id AND friend_id = current_user_id))) THEN
    RAISE EXCEPTION 'Esta pessoa não aceita mensagens diretas' USING ERRCODE = '42501';
  END IF;

  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, current_user_id), (conv_id, other_user_id);
  RETURN conv_id;
END;
$$;

-- ===== F05: DMs can only be marked as read by the recipient =====
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.direct_messages;
CREATE POLICY "Recipients can mark messages as read" ON public.direct_messages FOR UPDATE TO authenticated
  USING (is_conversation_member(auth.uid(), conversation_id) AND sender_id <> auth.uid())
  WITH CHECK (is_conversation_member(auth.uid(), conversation_id) AND sender_id <> auth.uid());
REVOKE UPDATE ON public.direct_messages FROM authenticated, anon;
GRANT UPDATE (read) ON public.direct_messages TO authenticated;

-- ===== P04: event message edits stay within a joined event =====
DROP POLICY IF EXISTS "Author can update own messages" ON public.event_messages;
CREATE POLICY "Author can update own messages" ON public.event_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.is_event_participant(event_id, auth.uid()));
CREATE OR REPLACE FUNCTION public.guard_event_message_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.event_id := OLD.event_id; NEW.user_id := OLD.user_id; NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_event_message_update ON public.event_messages;
CREATE TRIGGER a_guard_event_message_update BEFORE UPDATE ON public.event_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_message_update();

-- ===== F08: approximate location (~1 km) =====
CREATE OR REPLACE FUNCTION public.get_available_users(p_user_id uuid, p_city text DEFAULT NULL, p_interests text[] DEFAULT '{}'::text[])
RETURNS TABLE(id uuid, user_id uuid, interests text[], city text, location_lat double precision, location_lng double precision, expires_at timestamptz, created_at timestamptz, full_name text, avatar_url text, common_interests text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.user_id, a.interests, a.city,
    round(a.location_lat::numeric, 2)::double precision,
    round(a.location_lng::numeric, 2)::double precision,
    a.expires_at, a.created_at, p.full_name, p.avatar_url,
    ARRAY(SELECT unnest(a.interests) INTERSECT SELECT unnest(p_interests))
  FROM public.availability a
  JOIN public.profiles p ON p.user_id = a.user_id
  WHERE auth.uid() IS NOT NULL
    AND a.is_active = true AND a.expires_at > now()
    AND a.user_id <> auth.uid()
    AND p.suspended_reason IS NULL
    AND (p_city IS NULL OR a.city = p_city)
    AND a.interests && p_interests
  ORDER BY a.created_at DESC
  LIMIT 50;
$$;

-- ===== F11: achievements only by the system =====
DROP POLICY IF EXISTS "System can insert achievements" ON public.user_achievements;

-- ===== F12 / F09: immutable identity fields =====
CREATE OR REPLACE FUNCTION public.guard_user_review_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.event_id := OLD.event_id; NEW.reviewed_user_id := OLD.reviewed_user_id;
  NEW.reviewer_user_id := OLD.reviewer_user_id; NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_user_review_update ON public.user_reviews;
CREATE TRIGGER a_guard_user_review_update BEFORE UPDATE ON public.user_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_review_update();

CREATE OR REPLACE FUNCTION public.guard_event_review_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.event_id := OLD.event_id; NEW.user_id := OLD.user_id; NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_event_review_update ON public.event_reviews;
CREATE TRIGGER a_guard_event_review_update BEFORE UPDATE ON public.event_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_review_update();

CREATE OR REPLACE FUNCTION public.guard_friendship_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.user_id := OLD.user_id; NEW.friend_id := OLD.friend_id; NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_friendship_update ON public.friendships;
CREATE TRIGGER a_guard_friendship_update BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.guard_friendship_update();

-- ===== F10: community roles =====
CREATE OR REPLACE FUNCTION public.guard_community_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_public boolean;
BEGIN
  IF public.is_privileged_write() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF public.is_community_admin(NEW.community_id, auth.uid()) AND NEW.user_id <> auth.uid() THEN RETURN NEW; END IF;
    SELECT is_public INTO v_public FROM public.communities WHERE id = NEW.community_id;
    NEW.role := 'member';
    NEW.status := CASE WHEN COALESCE(v_public, false) THEN 'approved' ELSE 'pending' END;
  ELSE
    NEW.community_id := OLD.community_id; NEW.user_id := OLD.user_id;
    IF NOT public.is_community_admin(OLD.community_id, auth.uid()) OR OLD.user_id = auth.uid() THEN
      NEW.role := OLD.role; NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS a_guard_community_member ON public.community_members;
CREATE TRIGGER a_guard_community_member BEFORE INSERT OR UPDATE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_community_member();

-- ===== H03: capacity under concurrency =====
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE max_cap int; current_count int;
BEGIN
  SELECT max_participants INTO max_cap FROM events WHERE id = NEW.event_id FOR UPDATE;
  IF max_cap IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO current_count FROM event_participants WHERE event_id = NEW.event_id;
  IF current_count >= max_cap THEN
    RAISE EXCEPTION 'EVENT_FULL: Este evento já atingiu o número máximo de participantes (%).', max_cap;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger-only helpers should not be callable via API
REVOKE EXECUTE ON FUNCTION public.guard_profile_fields(), public.guard_event_fields(), public.guard_report_insert(),
  public.guard_verification_insert(), public.guard_marketplace_order_insert(), public.guard_community_member(),
  public.guard_event_message_update(), public.guard_user_review_update(), public.guard_event_review_update(),
  public.guard_friendship_update() FROM PUBLIC, anon, authenticated;