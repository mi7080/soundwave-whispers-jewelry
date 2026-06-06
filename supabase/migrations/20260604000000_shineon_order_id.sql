-- Persist ShineOn's own order id at submit time as the shipment-callback match key.
-- ShineOn's callback always includes its internal `order.id`; matching on it avoids
-- the source_id / store_order_id aliasing uncertainty (their callback may blank
-- source_id and only echo our ref under store_order_id / store_line_item_id).

ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS shineon_order_id text;

-- Fast lookup for the shipment-notification receiver.
CREATE INDEX IF NOT EXISTS idx_animus_orders_shineon_order_id
  ON public.animus_orders (shineon_order_id)
  WHERE shineon_order_id IS NOT NULL;
