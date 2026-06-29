
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- ===== BOOKS =====
DROP POLICY IF EXISTS "Books are public" ON public.books;
DROP POLICY IF EXISTS "Admins can manage books" ON public.books;

CREATE POLICY "Books are public" ON public.books FOR SELECT USING (true);
CREATE POLICY "Admins can manage books" ON public.books FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== CATEGORIES =====
DROP POLICY IF EXISTS "Categories are public" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ===== BOOK_UPLOADS =====
DROP POLICY IF EXISTS "Users can read own uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Admins can read all uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Admins can update uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can update own pending uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can delete own pending uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Admins can delete uploads" ON public.book_uploads;

CREATE POLICY "Users can read own uploads" ON public.book_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all uploads" ON public.book_uploads FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own uploads" ON public.book_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update uploads" ON public.book_uploads FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own pending uploads" ON public.book_uploads FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users can delete own pending uploads" ON public.book_uploads FOR DELETE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can delete uploads" ON public.book_uploads FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== READING_HISTORY =====
DROP POLICY IF EXISTS "Users can read own history" ON public.reading_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.reading_history;
DROP POLICY IF EXISTS "Users can update own history" ON public.reading_history;
DROP POLICY IF EXISTS "Users can delete own history" ON public.reading_history;

CREATE POLICY "Users can read own history" ON public.reading_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.reading_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own history" ON public.reading_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON public.reading_history FOR DELETE USING (auth.uid() = user_id);

-- ===== USER_ROLES =====
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
