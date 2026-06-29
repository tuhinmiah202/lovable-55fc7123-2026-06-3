
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Books table (approved/published books)
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  cover_url TEXT,
  category_id UUID REFERENCES public.categories(id),
  price INTEGER NOT NULL DEFAULT 0,
  pages INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 4.0,
  featured BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  uploader_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Book uploads table (pending approval)
CREATE TABLE public.book_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  file_url TEXT,
  cover_url TEXT,
  category_id UUID REFERENCES public.categories(id),
  price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.book_uploads ENABLE ROW LEVEL SECURITY;

-- Auto-create profile + user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_book_uploads_updated_at BEFORE UPDATE ON public.book_uploads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- user_roles: users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
-- admins can read all roles
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- categories: publicly readable
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- books: publicly readable
CREATE POLICY "Books are public" ON public.books FOR SELECT USING (true);
CREATE POLICY "Admins can manage books" ON public.books FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- book_uploads
CREATE POLICY "Users can read own uploads" ON public.book_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all uploads" ON public.book_uploads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own uploads" ON public.book_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending uploads" ON public.book_uploads FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can update uploads" ON public.book_uploads FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own pending uploads" ON public.book_uploads FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('cover-photos', 'cover-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('book-files', 'book-files', false);

-- Storage RLS policies
CREATE POLICY "Anyone can view covers" ON storage.objects FOR SELECT USING (bucket_id = 'cover-photos');
CREATE POLICY "Authenticated users can upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cover-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own covers" ON storage.objects FOR DELETE USING (bucket_id = 'cover-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view book files" ON storage.objects FOR SELECT USING (bucket_id = 'book-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can upload book files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'book-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view own book files" ON storage.objects FOR SELECT USING (bucket_id = 'book-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can delete book files" ON storage.objects FOR DELETE USING (bucket_id = 'book-files' AND public.has_role(auth.uid(), 'admin'));

-- Seed default categories
INSERT INTO public.categories (name) VALUES
  ('উপন্যাস'), ('কবিতা'), ('গল্প'), ('প্রবন্ধ'), ('বিজ্ঞান'),
  ('ইতিহাস'), ('শিশু সাহিত্য'), ('ধর্মীয়'), ('আত্মজীবনী'), ('থ্রিলার');
