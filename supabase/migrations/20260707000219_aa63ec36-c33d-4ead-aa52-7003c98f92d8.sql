
-- 1) availability: restrict SELECT to owner
DROP POLICY IF EXISTS "Users can view active availability" ON public.availability;
CREATE POLICY "Users can view own availability"
  ON public.availability FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) community_members: only members/admins can view roster
DROP POLICY IF EXISTS "Members visible to community members and public" ON public.community_members;
CREATE POLICY "Members visible to community members"
  ON public.community_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_community_member(community_id, auth.uid())
    OR public.is_community_admin(community_id, auth.uid())
  );

-- 3) user_achievements: only owner or when profile is public
DROP POLICY IF EXISTS "Users can view all achievements" ON public.user_achievements;
CREATE POLICY "Users can view own or public achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_profile_public(user_id)
  );

-- 4) Revoke EXECUTE from anon/authenticated on trigger + internal admin functions
DO $$
DECLARE
  fn text;
  trigger_fns text[] := ARRAY[
    'update_conversation_on_message','auto_mark_urgent_report','check_report_thresholds',
    'check_user_review_thresholds','check_event_capacity','notify_event_join','notify_event_update',
    'notify_direct_message','notify_new_message','notify_matching_events',
    'notify_other_participants_on_join','notify_user_review_received','notify_user_penalty',
    'notify_user_penalty_revoked','notify_friend_request_accepted','notify_friend_request',
    'auto_add_community_creator','update_community_member_count','handle_new_user',
    'set_private_code','generate_private_code','enforce_new_user_event_limit',
    'enforce_new_user_message_limit','is_service_role','get_complete_schema',
    'apply_penalty','revoke_penalty','approve_user_verification','approve_business_verification',
    'get_moderation_stats','get_reported_users','get_platform_metrics','cleanup_expired_availability'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- 5) Storage: remove broad avatars listing policy (files still accessible via public URLs)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar owners can read their own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.filename(name) LIKE (auth.uid()::text || '%')
         OR name LIKE ('%' || auth.uid()::text || '%'))
  );

-- 6) Realtime channel authorization: require authentication to subscribe
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);
