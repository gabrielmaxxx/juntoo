-- Remove the implicit PUBLIC execute grant, then re-grant narrowly
REVOKE EXECUTE ON FUNCTION public.calculate_reputation_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_grant_achievements(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_or_create_conversation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_available_users(uuid, text, text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_friends_events(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_unread_counts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_reputation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_restrictions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_send_notification(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_wants_notification(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_wants_notification(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_by_username(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_community_admin(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_event_participant(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_profile_public(uuid) FROM PUBLIC;

-- Signed-in only RPCs
GRANT EXECUTE ON FUNCTION public.calculate_reputation_score(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_grant_achievements(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_or_create_conversation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_users(uuid, text, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_friends_events(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unread_counts(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_reputation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_restrictions(uuid) TO authenticated, service_role;

-- Trigger-only helpers: service role / owner only
GRANT EXECUTE ON FUNCTION public.can_send_notification(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_wants_notification(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_wants_notification(uuid, text) TO service_role;

-- Public profile lookups and RLS predicates stay reachable by both roles
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_community_admin(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_event_participant(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_profile_public(uuid) TO anon, authenticated, service_role;