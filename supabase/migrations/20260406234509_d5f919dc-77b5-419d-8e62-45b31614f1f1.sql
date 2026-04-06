-- Allow anyone (even unauthenticated) to read animus_orders by ID for public soul pages
CREATE POLICY "Public can read animus_orders for soul pages"
ON public.animus_orders
FOR SELECT
TO anon, authenticated
USING (true);
