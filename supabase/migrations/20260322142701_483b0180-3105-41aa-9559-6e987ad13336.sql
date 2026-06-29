-- Create book_orders table for bKash payment tracking
CREATE TABLE public.book_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  transaction_id text NOT NULL DEFAULT '',
  mobile_number text NOT NULL DEFAULT '',
  amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id, transaction_id)
);

ALTER TABLE public.book_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders" ON public.book_orders
  AS PERMISSIVE FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all orders" ON public.book_orders
  AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own orders" ON public.book_orders
  AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders" ON public.book_orders
  AS PERMISSIVE FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete orders" ON public.book_orders
  AS PERMISSIVE FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_book_orders_updated_at
  BEFORE UPDATE ON public.book_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();