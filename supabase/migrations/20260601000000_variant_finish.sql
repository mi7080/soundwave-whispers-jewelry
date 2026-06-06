-- Persist the chosen pendant finish on the order.
-- The finish (steel/gold) used to live only in the checkout URL (?variant=), so an
-- order that never completed checkout (or lost the param) had no finish anywhere and
-- fulfillment fell back to steel — gold orders could ship the wrong SKU. Storing it
-- at order creation lets fulfillment resolve the correct finish × engraving SKU even
-- when shineon_sku was never written.
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS variant_finish text;
