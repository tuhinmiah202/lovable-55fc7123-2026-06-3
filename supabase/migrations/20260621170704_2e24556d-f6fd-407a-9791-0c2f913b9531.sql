
-- 1. Force login to read: drop part-1 free policy
DROP POLICY IF EXISTS "Part 1 is a free preview" ON public.book_parts;

-- Free-book parts policy should now require authentication
DROP POLICY IF EXISTS "Free book parts are public" ON public.book_parts;
CREATE POLICY "Free book parts need auth"
  ON public.book_parts FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = book_parts.book_id AND COALESCE(b.price, 0) = 0
    )
  );

-- 2. get_book_part_content: require auth always
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
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  SELECT price, uploader_id INTO v_price, v_uploader FROM public.books WHERE id = p_book_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT content INTO v_content FROM public.book_parts
   WHERE book_id = p_book_id AND part_number = p_part_number AND status = 'approved';
  IF v_content IS NULL THEN RETURN NULL; END IF;

  IF COALESCE(v_price, 0) = 0 THEN
    RETURN v_content;
  END IF;

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

-- 3. Payment fields on book_orders
ALTER TABLE public.book_orders
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'bkash',
  ADD COLUMN IF NOT EXISTS buyer_msisdn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference text;

CREATE UNIQUE INDEX IF NOT EXISTS book_orders_reference_unique
  ON public.book_orders(reference) WHERE reference IS NOT NULL;

-- 4. Payment events audit table
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.book_orders(id) ON DELETE SET NULL,
  raw_sms text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'bkash',
  parsed_amount integer,
  parsed_sender text,
  parsed_txid text,
  parsed_reference text,
  matched boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS book_parts_book_part_idx
  ON public.book_parts(book_id, part_number);
CREATE INDEX IF NOT EXISTS book_orders_user_book_status_idx
  ON public.book_orders(user_id, book_id, status);
CREATE INDEX IF NOT EXISTS ad_unlocks_user_book_part_idx
  ON public.ad_unlocks(user_id, book_id, part_number);
CREATE INDEX IF NOT EXISTS book_part_view_log_part_date_idx
  ON public.book_part_view_log(part_id, viewed_on);

-- 6. Revoke EXECUTE on trigger-only definer functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
