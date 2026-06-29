
-- Drop all existing policies on book_uploads
DROP POLICY IF EXISTS "Admins can read all uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Admins can update uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can delete own pending uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can read own uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can update own pending uploads" ON public.book_uploads;

-- Recreate as PERMISSIVE
CREATE POLICY "Admins can read all uploads"
ON public.book_uploads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own uploads"
ON public.book_uploads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update uploads"
ON public.book_uploads FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own pending uploads"
ON public.book_uploads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can insert own uploads"
ON public.book_uploads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending uploads"
ON public.book_uploads FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can delete uploads"
ON public.book_uploads FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
