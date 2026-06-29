
CREATE TABLE IF NOT EXISTS public.book_part_view_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.book_parts(id) ON DELETE CASCADE,
  viewer_key text NOT NULL,
  viewed_on date NOT NULL DEFAULT (now()::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (part_id, viewer_key, viewed_on)
);
GRANT SELECT, INSERT ON public.book_part_view_log TO anon, authenticated;
GRANT ALL ON public.book_part_view_log TO service_role;
ALTER TABLE public.book_part_view_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "view log insert only" ON public.book_part_view_log
    FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admins read view log" ON public.book_part_view_log
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.book_parts ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.record_part_view(p_part_id uuid, p_viewer_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  INSERT INTO public.book_part_view_log (part_id, viewer_key)
  VALUES (p_part_id, p_viewer_key)
  ON CONFLICT (part_id, viewer_key, viewed_on) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted > 0 THEN
    UPDATE public.book_parts SET views = COALESCE(views, 0) + 1 WHERE id = p_part_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.record_part_view(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_part_view(uuid, text) TO anon, authenticated;
