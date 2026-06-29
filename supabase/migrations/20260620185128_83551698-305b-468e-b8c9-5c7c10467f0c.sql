
ALTER VIEW public.book_parts_meta SET (security_invoker = on);
ALTER VIEW public.public_writer_profiles SET (security_invoker = on);

DROP POLICY IF EXISTS "view log insert only" ON public.book_part_view_log;
CREATE POLICY "view log insert"
ON public.book_part_view_log FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.book_parts p WHERE p.id = part_id AND p.status = 'approved')
);
