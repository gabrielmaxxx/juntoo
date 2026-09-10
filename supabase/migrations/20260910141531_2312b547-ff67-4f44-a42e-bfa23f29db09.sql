REVOKE ALL ON FUNCTION public.enforce_new_user_event_limit() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.enforce_new_user_message_limit() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.check_event_capacity() FROM anon, authenticated, public;