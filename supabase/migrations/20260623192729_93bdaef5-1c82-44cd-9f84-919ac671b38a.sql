
-- 1) Restore Part 1 free preview + free-book full access in get_book_part_content
CREATE OR REPLACE FUNCTION public.get_book_part_content(p_book_id uuid, p_part_number integer)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Free book: anyone can read all parts
  IF COALESCE(v_price, 0) = 0 THEN
    RETURN v_content;
  END IF;

  -- Paid book: Part 1 is always a free preview
  IF p_part_number = 1 THEN
    RETURN v_content;
  END IF;

  -- Beyond part 1 you must be logged in
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
$function$;

REVOKE EXECUTE ON FUNCTION public.get_book_part_content(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_book_part_content(uuid, integer) TO anon, authenticated;

-- 2) handle_new_user picks up Google full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      ''
    ),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- 3) book_orders: phone-based matching
ALTER TABLE public.book_orders
  ADD COLUMN IF NOT EXISTS payer_phone text;

CREATE INDEX IF NOT EXISTS book_orders_pending_match_idx
  ON public.book_orders (provider, payer_phone, amount, status);

DROP INDEX IF EXISTS public.book_orders_reference_key;
DROP INDEX IF EXISTS public.book_orders_reference_unique;

-- 4) book_parts: optional file_url
ALTER TABLE public.book_parts
  ADD COLUMN IF NOT EXISTS file_url text;

-- 5) withdrawal_requests
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount >= 500),
  method text NOT NULL CHECK (method IN ('bkash','nagad')),
  payout_number text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  admin_note text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawals_own_select" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "withdrawals_own_insert" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "withdrawals_admin_update" ON public.withdrawal_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER withdrawal_requests_set_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS withdrawal_requests_user_idx
  ON public.withdrawal_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawal_requests_status_idx
  ON public.withdrawal_requests (status, created_at DESC);

-- 6) app_installs
CREATE TABLE IF NOT EXISTS public.app_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id text,
  user_agent text,
  user_id uuid,
  installed_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.app_installs TO anon, authenticated;
GRANT SELECT ON public.app_installs TO authenticated;
GRANT ALL ON public.app_installs TO service_role;

ALTER TABLE public.app_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_installs_anyone_insert" ON public.app_installs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "app_installs_admin_select" ON public.app_installs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS app_installs_installed_at_idx
  ON public.app_installs (installed_at DESC);
