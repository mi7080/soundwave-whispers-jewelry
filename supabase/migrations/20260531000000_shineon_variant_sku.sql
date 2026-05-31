-- Per-order ShineOn variant SKU.
-- The pendant ships in 4 ShineOn variants on "The ANIMUS Soulwave Pendant"
-- (Partner CSV/API store): finish (steel/gold) × back engraving (add_name_to_back).
-- The chosen SKU is resolved at checkout from the selected finish + add_name_to_back
-- and stored here, so fulfillment (icount-payment-webhook + admin CSV export) submits
-- the correct variant instead of a single hardcoded SKU.
--   steel / no engraving  -> SO-15845642
--   steel / engraving     -> SO-15845643
--   gold  / no engraving  -> SO-15845644
--   gold  / engraving     -> SO-15845645
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS shineon_sku text;
