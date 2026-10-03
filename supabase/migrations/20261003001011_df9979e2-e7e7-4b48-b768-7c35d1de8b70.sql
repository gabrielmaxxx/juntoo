REVOKE EXECUTE ON FUNCTION public.is_staff(uuid), public.is_user_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid), public.is_user_blocked(uuid) TO authenticated;