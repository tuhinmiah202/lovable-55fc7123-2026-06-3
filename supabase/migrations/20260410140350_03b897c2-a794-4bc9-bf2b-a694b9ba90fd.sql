CREATE POLICY "Anyone can read writer profiles"
ON public.profiles
FOR SELECT
USING (is_writer = true);