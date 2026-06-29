CREATE OR REPLACE VIEW public.book_parts_meta AS
SELECT
  id,
  book_id,
  part_number,
  title,
  status,
  views,
  created_at,
  updated_at
FROM public.book_parts
WHERE status = 'approved';

GRANT SELECT ON public.book_parts_meta TO anon;
GRANT SELECT ON public.book_parts_meta TO authenticated;
GRANT SELECT ON public.book_parts_meta TO service_role;