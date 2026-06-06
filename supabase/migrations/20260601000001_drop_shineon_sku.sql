-- Drop the stored ShineOn SKU. The SKU is derived data — a pure function of
-- variant_finish × add_name_to_back — so it's resolved at fulfillment instead of
-- stored, leaving a single source of truth and nothing to keep in sync.
ALTER TABLE public.animus_orders
  DROP COLUMN IF EXISTS shineon_sku;
