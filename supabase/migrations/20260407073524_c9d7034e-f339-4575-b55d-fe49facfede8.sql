CREATE POLICY "Anyone can update orders"
ON public.animus_orders
FOR UPDATE TO public
USING (true)
WITH CHECK (true);