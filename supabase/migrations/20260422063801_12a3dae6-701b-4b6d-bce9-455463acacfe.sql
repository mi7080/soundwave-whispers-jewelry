-- Allow anonymous and authenticated users to update orders that are still in pre-payment states.
-- Paid/fulfilled orders remain protected (only admins can update those, per existing policy).
CREATE POLICY "Anyone can update pre-payment orders"
ON public.animus_orders
FOR UPDATE
TO anon, authenticated
USING (status IN ('draft', 'pending', 'shipping_captured'))
WITH CHECK (status IN ('draft', 'pending', 'shipping_captured'));