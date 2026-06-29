-- Performance indexes for high-traffic queries.
-- All use IF NOT EXISTS so re-running is safe.

-- Books: ordered list + featured filter
CREATE INDEX IF NOT EXISTS idx_books_created_at_desc ON public.books (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_category_id ON public.books (category_id);
CREATE INDEX IF NOT EXISTS idx_books_uploader_id ON public.books (uploader_id);
CREATE INDEX IF NOT EXISTS idx_books_featured ON public.books (featured) WHERE featured = true;

-- Book parts: lookups by book + part number, ordered listing
CREATE INDEX IF NOT EXISTS idx_book_parts_book_part ON public.book_parts (book_id, part_number);

-- Orders: per-user/per-book purchase check, plus webhook lookup by phone
CREATE INDEX IF NOT EXISTS idx_book_orders_user_book ON public.book_orders (user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_book_orders_status ON public.book_orders (status);
CREATE INDEX IF NOT EXISTS idx_book_orders_payer_phone ON public.book_orders (payer_phone) WHERE payer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_book_orders_created_at_desc ON public.book_orders (created_at DESC);

-- Ad unlocks: fast lookups per user/book
CREATE INDEX IF NOT EXISTS idx_ad_unlocks_user_book ON public.ad_unlocks (user_id, book_id);

-- Profiles: writer listings
CREATE INDEX IF NOT EXISTS idx_profiles_is_writer ON public.profiles (is_writer) WHERE is_writer = true;

-- User roles: has_role() function lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles (user_id, role);
