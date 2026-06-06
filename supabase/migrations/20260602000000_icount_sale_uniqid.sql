-- Deterministic link between an ANIMUS order and its iCount sale.
-- The old flow created the payment via the wrong endpoint and fell back to a
-- shared static page that carried no order reference, so the webhook could only
-- match by customer email — which mis-routes when one email has two open orders.
-- paypage/generate_sale returns a unique `sale_uniqid` per sale; we store it at
-- checkout and match the incoming webhook to it, one-to-one, no email guessing.
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS icount_sale_uniqid text;

-- Webhook matching looks orders up by this value, so index it.
CREATE INDEX IF NOT EXISTS idx_animus_orders_icount_sale_uniqid
  ON public.animus_orders (icount_sale_uniqid);
