
-- 1) Restore full grant on book_parts (undo prior column revoke)
GRANT SELECT ON public.book_parts TO anon, authenticated;

-- 2) Drop the previously over-broad public policy and add row-level policies
DROP POLICY IF EXISTS "Book parts are public" ON public.book_parts;

CREATE POLICY "Part 1 is a free preview"
ON public.book_parts FOR SELECT TO anon, authenticated
USING (part_number = 1 AND status = 'approved');

CREATE POLICY "Free book parts are public"
ON public.book_parts FOR SELECT TO anon, authenticated
USING (
  status = 'approved'
  AND EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_parts.book_id AND COALESCE(b.price, 0) = 0)
);

CREATE POLICY "Uploader can read own book parts"
ON public.book_parts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_parts.book_id AND b.uploader_id = auth.uid())
);

CREATE POLICY "Confirmed buyers can read all parts"
ON public.book_parts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.book_orders o
    WHERE o.book_id = book_parts.book_id AND o.user_id = auth.uid() AND o.status = 'confirmed'
  )
);

-- 3) Public metadata view (lets users still see locked part titles in lists)
DROP VIEW IF EXISTS public.book_parts_meta;
CREATE VIEW public.book_parts_meta AS
SELECT id, book_id, part_number, title, status, created_at, updated_at
FROM public.book_parts
WHERE status = 'approved';
GRANT SELECT ON public.book_parts_meta TO anon, authenticated;

-- 4) Views counter (unique per user per day)
ALTER TABLE public.book_parts ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

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
CREATE POLICY "view log insert only" ON public.book_part_view_log
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read view log" ON public.book_part_view_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.record_part_view(p_part_id uuid, p_viewer_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean := false;
BEGIN
  INSERT INTO public.book_part_view_log (part_id, viewer_key)
  VALUES (p_part_id, p_viewer_key)
  ON CONFLICT (part_id, viewer_key, viewed_on) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted THEN
    UPDATE public.book_parts SET views = COALESCE(views, 0) + 1 WHERE id = p_part_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.record_part_view(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_part_view(uuid, text) TO anon, authenticated;

-- 5) Ad-unlocks (permanent per user + part)
CREATE TABLE IF NOT EXISTS public.ad_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL,
  part_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id, part_number)
);
GRANT SELECT, INSERT ON public.ad_unlocks TO authenticated;
GRANT ALL ON public.ad_unlocks TO service_role;
ALTER TABLE public.ad_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own ad unlocks" ON public.ad_unlocks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own ad unlocks" ON public.ad_unlocks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read all ad unlocks" ON public.ad_unlocks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6) Update content function to also honor ad_unlocks
CREATE OR REPLACE FUNCTION public.get_book_part_content(p_book_id uuid, p_part_number int)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price int;
  v_uploader uuid;
  v_content text;
  v_uid uuid := auth.uid();
BEGIN
  SELECT price, uploader_id INTO v_price, v_uploader FROM public.books WHERE id = p_book_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT content INTO v_content FROM public.book_parts
   WHERE book_id = p_book_id AND part_number = p_part_number AND status = 'approved';
  IF v_content IS NULL THEN RETURN NULL; END IF;

  IF p_part_number = 1 OR COALESCE(v_price, 0) = 0 THEN
    RETURN v_content;
  END IF;

  IF v_uid IS NULL THEN RETURN NULL; END IF;

  IF v_uid = v_uploader OR public.has_role(v_uid, 'admin'::app_role) THEN
    RETURN v_content;
  END IF;

  IF EXISTS (SELECT 1 FROM public.book_orders
              WHERE book_id = p_book_id AND user_id = v_uid AND status = 'confirmed') THEN
    RETURN v_content;
  END IF;

  IF EXISTS (SELECT 1 FROM public.ad_unlocks
              WHERE book_id = p_book_id AND part_number = p_part_number AND user_id = v_uid) THEN
    RETURN v_content;
  END IF;

  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.get_book_part_content(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_book_part_content(uuid, int) TO anon, authenticated;
