-- Tracking fields populated by the ShineOn shipment-notification callback.
-- We already had tracking_number + tracking_updated_at; ShineOn also sends a
-- tracking URL and carrier, which the shipping email surfaces to the customer.
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS tracking_carrier TEXT;
