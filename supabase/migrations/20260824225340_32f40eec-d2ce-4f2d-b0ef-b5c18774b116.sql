-- 1. Storage: folder-based ownership for avatars bucket
DROP POLICY IF EXISTS "Users can upload avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can read their own files" ON storage.objects;

CREATE POLICY "Users can upload own avatar folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar folder"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar folder"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own avatar folder"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Realtime: scope topic subscriptions to authorized users
CREATE OR REPLACE FUNCTION public.safe_uuid(p_text text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN p_text::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_uuid(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;

CREATE POLICY "Users can only join authorized realtime topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'user-notifications-%'
      THEN realtime.topic() = 'user-notifications-' || auth.uid()::text
    WHEN realtime.topic() LIKE 'cache-user-%'
      THEN realtime.topic() = 'cache-user-' || auth.uid()::text
    WHEN realtime.topic() LIKE 'chat-%'
      THEN public.is_conversation_member(auth.uid(), public.safe_uuid(substring(realtime.topic() from 6)))
    WHEN realtime.topic() LIKE 'event-chat-%'
      THEN public.is_event_participant(public.safe_uuid(substring(realtime.topic() from 12)), auth.uid())
    WHEN realtime.topic() LIKE 'event-%-messages'
      THEN public.is_event_participant(
        public.safe_uuid(substring(realtime.topic() from 7 for length(realtime.topic()) - 15)),
        auth.uid())
    WHEN realtime.topic() LIKE 'event-realtime-%'
      THEN public.safe_uuid(substring(realtime.topic() from 16)) IS NOT NULL
    WHEN realtime.topic() LIKE 'community-chat-%'
      THEN public.is_community_member(public.safe_uuid(substring(realtime.topic() from 16)), auth.uid())
    WHEN realtime.topic() LIKE 'community-%'
      THEN public.is_community_member(public.safe_uuid(substring(realtime.topic() from 11)), auth.uid())
    WHEN realtime.topic() LIKE 'admin-%'
      THEN public.has_role(auth.uid(), 'moderator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)
    WHEN realtime.topic() IN ('cache-content', 'cache-messaging', 'availability-changes', 'verification-status')
      THEN true
    ELSE false
  END
);

-- 3. Lock down SECURITY DEFINER functions that should not be publicly callable
REVOKE EXECUTE ON FUNCTION public.calculate_reputation_score(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_grant_achievements(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_or_create_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_available_users(uuid, text, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_friends_events(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_counts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_reputation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_restrictions(uuid) FROM anon;

-- internal trigger-only helpers: not callable from the API at all
REVOKE EXECUTE ON FUNCTION public.can_send_notification(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_wants_notification(text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_wants_notification(uuid, text) FROM anon, authenticated;