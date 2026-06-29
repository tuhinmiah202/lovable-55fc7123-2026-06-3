
-- Fix ALL policies to be PERMISSIVE (currently all are RESTRICTIVE)

-- ===== BOOKS =====
DROP POLICY IF EXISTS "Books are public" ON public.books;
DROP POLICY IF EXISTS "Admins can manage books" ON public.books;
CREATE POLICY "Books are public" ON public.books AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Admins can manage books" ON public.books AS PERMISSIVE FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== CATEGORIES =====
DROP POLICY IF EXISTS "Categories are public" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Categories are public" ON public.categories AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories AS PERMISSIVE FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles AS PERMISSIVE FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE USING (auth.uid() = id);

-- ===== BOOK_UPLOADS =====
DROP POLICY IF EXISTS "Users can read own uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Admins can read all uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Admins can update uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can update own pending uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can delete own pending uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Admins can delete uploads" ON public.book_uploads;
CREATE POLICY "Users can read own uploads" ON public.book_uploads AS PERMISSIVE FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all uploads" ON public.book_uploads AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own uploads" ON public.book_uploads AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update uploads" ON public.book_uploads AS PERMISSIVE FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own pending uploads" ON public.book_uploads AS PERMISSIVE FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users can delete own pending uploads" ON public.book_uploads AS PERMISSIVE FOR DELETE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can delete uploads" ON public.book_uploads AS PERMISSIVE FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== READING_HISTORY =====
DROP POLICY IF EXISTS "Users can read own history" ON public.reading_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.reading_history;
DROP POLICY IF EXISTS "Users can update own history" ON public.reading_history;
DROP POLICY IF EXISTS "Users can delete own history" ON public.reading_history;
CREATE POLICY "Users can read own history" ON public.reading_history AS PERMISSIVE FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.reading_history AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own history" ON public.reading_history AS PERMISSIVE FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON public.reading_history AS PERMISSIVE FOR DELETE USING (auth.uid() = user_id);

-- ===== USER_ROLES =====
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles AS PERMISSIVE FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
