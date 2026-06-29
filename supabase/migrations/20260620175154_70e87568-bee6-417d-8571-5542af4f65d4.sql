
-- 1) payment_settings: only authenticated users can read
DROP POLICY IF EXISTS "Anyone can read payment settings" ON public.payment_settings;
CREATE POLICY "Authenticated users can read payment settings"
ON public.payment_settings FOR SELECT TO authenticated USING (true);

-- 2) profiles: remove broad writer-public policy; create a safe public view
DROP POLICY IF EXISTS "Anyone can read writer profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.public_writer_profiles
WITH (security_invoker = true) AS
SELECT id, name, avatar_url, hometown, village, facebook_page, is_writer
FROM public.profiles
WHERE is_writer = true;

GRANT SELECT ON public.public_writer_profiles TO anon, authenticated;

-- Allow reading limited public columns of writer profiles via the base table too,
-- so existing direct selects still work without exposing sensitive columns.
-- We do this by adding a SELECT policy that only returns rows for writers, but
-- since RLS is row-level, we instead rely on the view above. Block direct base reads of writers for anon.
-- (Existing self/admin select policies remain in place.)

-- 3) book_parts: gate full content; keep metadata public for navigation
-- Revoke direct read of 'content' column for anon/authenticated.
REVOKE SELECT (content) ON public.book_parts FROM anon, authenticated;
GRANT SELECT (id, book_id, part_number, title, status, created_at, updated_at)
  ON public.book_parts TO anon, authenticated;

-- Secure function returns content only when caller has access
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
  SELECT price, uploader_id INTO v_price, v_uploader
  FROM public.books WHERE id = p_book_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT content INTO v_content
  FROM public.book_parts
  WHERE book_id = p_book_id AND part_number = p_number_or(p_part_number) AND status = 'approved';
  -- (helper not needed; inline below)
  RETURN NULL;
END;
$$;

-- Replace with simpler correct version
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
  v_allowed boolean := false;
BEGIN
  SELECT price, uploader_id INTO v_price, v_uploader
  FROM public.books WHERE id = p_book_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT content INTO v_content
  FROM public.book_parts
  WHERE book_id = p_book_id AND part_number = p_part_number AND status = 'approved';
  IF v_content IS NULL THEN RETURN NULL; END IF;

  -- Always allow part 1 (free preview) and any free book
  IF p_part_number = 1 OR COALESCE(v_price, 0) = 0 THEN
    RETURN v_content;
  END IF;

  IF v_uid IS NULL THEN RETURN NULL; END IF;

  -- Uploader / admin
  IF v_uid = v_uploader OR public.has_role(v_uid, 'admin'::app_role) THEN
    RETURN v_content;
  END IF;

  -- Confirmed purchase
  IF EXISTS (
    SELECT 1 FROM public.book_orders
    WHERE book_id = p_book_id AND user_id = v_uid AND status = 'confirmed'
  ) THEN
    RETURN v_content;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_book_part_content(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_book_part_content(uuid, int) TO anon, authenticated;

-- 4) book_orders: require auth for insertion
DROP POLICY IF EXISTS "Users and guests can create orders" ON public.book_orders;
CREATE POLICY "Authenticated users can create own orders"
ON public.book_orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 5) user_roles: only admins can write
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6) Storage: cover-photos — path-scoped INSERT and UPDATE
DROP POLICY IF EXISTS "Authenticated users can upload covers" ON storage.objects;
CREATE POLICY "Users can upload covers to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cover-photos'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own covers"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'cover-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'cover-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 7) Remove broad SELECT on cover-photos (public URLs still serve files via CDN)
DROP POLICY IF EXISTS "Anyone can view covers" ON storage.objects;
