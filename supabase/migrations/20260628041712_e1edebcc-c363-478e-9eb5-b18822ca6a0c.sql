-- 1) Tighten the permissive INSERT policy on book_part_view_log.
-- The record_part_view RPC is SECURITY DEFINER (owned by postgres) and
-- bypasses RLS, so direct table inserts from clients are unnecessary.
DROP POLICY IF EXISTS "view log insert only" ON public.book_part_view_log;
CREATE POLICY "view log no direct insert"
  ON public.book_part_view_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- 2) Revoke EXECUTE on SECURITY DEFINER helpers that should not be
-- callable from the Data API. They are still callable internally by
-- RLS policies and triggers (which run as definer/owner).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- record_part_view stays callable by anon + authenticated (guests read part 1).