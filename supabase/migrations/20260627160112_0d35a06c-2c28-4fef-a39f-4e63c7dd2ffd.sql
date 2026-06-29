
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ COMMON UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  mobile_number TEXT,
  hometown TEXT,
  village TEXT,
  facebook_id TEXT,
  facebook_page TEXT,
  bkash_number TEXT,
  avatar_url TEXT,
  is_writer BOOLEAN NOT NULL DEFAULT false,
  writer_blocked BOOLEAN NOT NULL DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ USER_ROLES ============
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read_all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ BOOKS ============
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  content TEXT,
  cover_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price INTEGER NOT NULL DEFAULT 0,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  pages INTEGER,
  rating NUMERIC(3,2),
  ads_disabled BOOLEAN NOT NULL DEFAULT false,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.books TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_read_all" ON public.books FOR SELECT USING (true);
CREATE POLICY "books_admin_all" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_books_updated BEFORE UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_books_uploader ON public.books(uploader_id);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category_id);

-- ============ BOOK_PARTS ============
CREATE TABLE IF NOT EXISTS public.book_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, part_number)
);
GRANT SELECT ON public.book_parts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.book_parts TO authenticated;
GRANT ALL ON public.book_parts TO service_role;
ALTER TABLE public.book_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_parts_read_all" ON public.book_parts FOR SELECT USING (true);
CREATE POLICY "book_parts_admin_all" ON public.book_parts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_book_parts_book ON public.book_parts(book_id);

-- View used by reader/book detail
CREATE OR REPLACE VIEW public.book_parts_meta AS
SELECT id, book_id, part_number, title, views FROM public.book_parts WHERE status = 'approved';
GRANT SELECT ON public.book_parts_meta TO anon, authenticated, service_role;

-- ============ BOOK_UPLOADS ============
CREATE TABLE IF NOT EXISTS public.book_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  author_name TEXT,
  description TEXT,
  content TEXT,
  cover_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price INTEGER NOT NULL DEFAULT 0,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  part_number INTEGER,
  is_new_part BOOLEAN NOT NULL DEFAULT false,
  uploader_profile_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_uploads TO authenticated;
GRANT ALL ON public.book_uploads TO service_role;
ALTER TABLE public.book_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uploads_select_own_or_admin" ON public.book_uploads FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "uploads_insert_own" ON public.book_uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uploads_update_admin" ON public.book_uploads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "uploads_delete_own_or_admin" ON public.book_uploads FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ BOOK_ORDERS ============
CREATE TABLE IF NOT EXISTS public.book_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  provider TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payer_phone TEXT,
  buyer_msisdn TEXT,
  mobile_number TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_orders TO authenticated;
GRANT INSERT ON public.book_orders TO anon;
GRANT ALL ON public.book_orders TO service_role;
ALTER TABLE public.book_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own_or_admin" ON public.book_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders_insert_anyone" ON public.book_orders FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "orders_update_admin" ON public.book_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders_delete_admin" ON public.book_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.book_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_book ON public.book_orders(book_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone_status ON public.book_orders(payer_phone, status);

-- ============ AD_UNLOCKS ============
CREATE TABLE IF NOT EXISTS public.ad_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id, part_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_unlocks TO authenticated;
GRANT ALL ON public.ad_unlocks TO service_role;
ALTER TABLE public.ad_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_unlocks_own" ON public.ad_unlocks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PAYMENT_SETTINGS ============
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT DEFAULT 'bkash',
  bkash_number TEXT NOT NULL,
  bkash_qr_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_settings_read" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "payment_settings_admin" ON public.payment_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ WITHDRAWAL_REQUESTS ============
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT,
  payout_number TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT UPDATE, DELETE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_select_own_or_admin" ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wd_insert_own" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wd_update_admin" ON public.withdrawal_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ WRITER_APPLICATIONS ============
CREATE TABLE IF NOT EXISTS public.writer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  mobile_number TEXT,
  hometown TEXT,
  village TEXT,
  facebook_page TEXT,
  facebook_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.writer_applications TO authenticated;
GRANT ALL ON public.writer_applications TO service_role;
ALTER TABLE public.writer_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_select_own_or_admin" ON public.writer_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wa_insert_own" ON public.writer_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wa_delete_own_or_admin" ON public.writer_applications FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wa_update_admin" ON public.writer_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ APP_INSTALLS ============
CREATE TABLE IF NOT EXISTS public.app_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.app_installs TO anon, authenticated;
GRANT SELECT, DELETE ON public.app_installs TO authenticated;
GRANT ALL ON public.app_installs TO service_role;
ALTER TABLE public.app_installs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installs_insert_anyone" ON public.app_installs FOR INSERT WITH CHECK (true);
CREATE POLICY "installs_admin_read" ON public.app_installs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "installs_admin_delete" ON public.app_installs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ BOOK_RATINGS ============
CREATE TABLE IF NOT EXISTS public.book_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);
GRANT SELECT ON public.book_ratings TO anon, authenticated;
GRANT INSERT ON public.book_ratings TO authenticated;
GRANT ALL ON public.book_ratings TO service_role;
ALTER TABLE public.book_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_read_all" ON public.book_ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert_purchaser" ON public.book_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ READING_HISTORY ============
CREATE TABLE IF NOT EXISTS public.reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  last_part INTEGER NOT NULL DEFAULT 1,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_history TO authenticated;
GRANT ALL ON public.reading_history TO service_role;
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rh_own" ON public.reading_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PAYMENT_EVENTS (service role only) ============
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.book_orders(id) ON DELETE SET NULL,
  raw_sms TEXT,
  provider TEXT,
  parsed_amount INTEGER,
  parsed_sender TEXT,
  parsed_txid TEXT,
  parsed_reference TEXT,
  matched BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_admin_read" ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ PUBLIC WRITER PROFILES VIEW ============
CREATE OR REPLACE VIEW public.public_writer_profiles AS
SELECT id, name, avatar_url, is_writer, writer_blocked, created_at
FROM public.profiles
WHERE is_writer = true;
GRANT SELECT ON public.public_writer_profiles TO anon, authenticated, service_role;
