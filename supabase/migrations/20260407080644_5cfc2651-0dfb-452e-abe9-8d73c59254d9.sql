
CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bkash_number text NOT NULL DEFAULT '',
  bkash_qr_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read payment settings" ON public.payment_settings
  AS PERMISSIVE FOR SELECT USING (true);

CREATE POLICY "Admins can manage payment settings" ON public.payment_settings
  AS PERMISSIVE FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
