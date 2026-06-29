ALTER TABLE public.book_orders
ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users can insert own orders" ON public.book_orders;

CREATE POLICY "Users and guests can create orders"
ON public.book_orders
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (auth.uid() IS NULL AND user_id IS NULL)
);