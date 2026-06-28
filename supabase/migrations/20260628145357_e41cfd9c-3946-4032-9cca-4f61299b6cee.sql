REVOKE EXECUTE ON FUNCTION public.can_manage_users(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_manage_users(uuid) TO authenticated;