DROP VIEW IF EXISTS public.book_parts_meta CASCADE;
CREATE VIEW public.book_parts_meta
WITH (security_invoker=on) AS
SELECT
  id,
  book_id,
  part_number,
  title,
  status,
  views,
  created_at,
  updated_at
FROM public.book_parts
WHERE status = 'approved';

GRANT SELECT ON public.book_parts_meta TO anon, authenticated;
GRANT ALL ON public.book_parts_meta TO service_role;

GRANT SELECT ON public.books TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.book_parts TO anon, authenticated;
GRANT SELECT, INSERT ON public.ad_unlocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_orders TO authenticated;
GRANT SELECT, INSERT ON public.app_installs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.writer_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_uploads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.books, public.categories, public.book_parts, public.ad_unlocks,
              public.book_orders, public.app_installs, public.profiles,
              public.writer_applications, public.book_uploads, public.user_roles TO service_role;

DROP POLICY IF EXISTS "Paid first part is public preview" ON public.book_parts;
CREATE POLICY "Paid first part is public preview"
ON public.book_parts FOR SELECT TO anon, authenticated
USING (status = 'approved' AND part_number = 1);

DROP POLICY IF EXISTS "Approved parts metadata visible to users" ON public.book_parts;
CREATE POLICY "Approved parts metadata visible to users"
ON public.book_parts FOR SELECT TO authenticated
USING (status = 'approved');

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can create own orders" ON public.book_orders;
CREATE POLICY "Authenticated users can create own orders"
ON public.book_orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

UPDATE public.book_orders
SET payer_phone = COALESCE(NULLIF(payer_phone, ''), NULLIF(buyer_msisdn, ''), NULLIF(mobile_number, ''))
WHERE payer_phone IS NULL OR payer_phone = '';

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
      NULLIF(NEW.raw_user_meta_data->>'user_name', ''),
      split_part(COALESCE(NEW.email, ''), '@', 1),
      ''
    ),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET name = CASE
        WHEN public.profiles.name IS NULL OR public.profiles.name = '' THEN EXCLUDED.name
        ELSE public.profiles.name
      END,
      email = COALESCE(public.profiles.email, EXCLUDED.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();