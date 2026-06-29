
-- Views: run with caller's privileges
ALTER VIEW public.book_parts_meta SET (security_invoker = true);
ALTER VIEW public.public_writer_profiles SET (security_invoker = true);

-- Restrict has_role execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Tighten permissive INSERT policies
DROP POLICY IF EXISTS "installs_insert_anyone" ON public.app_installs;
CREATE POLICY "installs_insert_self_or_anon" ON public.app_installs FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
