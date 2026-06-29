
-- =============================================
-- FIX: Drop all RESTRICTIVE policies and recreate as PERMISSIVE
-- =============================================

-- book_uploads policies
DROP POLICY IF EXISTS "Admins can read all uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Admins can update uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can delete own pending uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can read own uploads" ON public.book_uploads;
DROP POLICY IF EXISTS "Users can update own pending uploads" ON public.book_uploads;

CREATE POLICY "Admins can read all uploads" ON public.book_uploads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update uploads" ON public.book_uploads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own pending uploads" ON public.book_uploads FOR DELETE TO authenticated USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users can insert own uploads" ON public.book_uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own uploads" ON public.book_uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own pending uploads" ON public.book_uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending');

-- books policies
DROP POLICY IF EXISTS "Admins can manage books" ON public.books;
DROP POLICY IF EXISTS "Books are public" ON public.books;

CREATE POLICY "Admins can manage books" ON public.books FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Books are public" ON public.books FOR SELECT USING (true);

-- categories policies
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are public" ON public.categories;

CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);

-- profiles policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles policies
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- ADD: Writer info columns to profiles
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bkash_number text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_id text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_page text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_writer boolean DEFAULT false;

-- =============================================
-- ADD: Reading history table
-- =============================================
CREATE TABLE IF NOT EXISTS public.reading_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own history" ON public.reading_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.reading_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own history" ON public.reading_history FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON public.reading_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
