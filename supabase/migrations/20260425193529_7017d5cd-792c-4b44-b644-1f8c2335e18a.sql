ALTER TABLE public.animus_orders
ADD COLUMN IF NOT EXISTS icount_webhook_payload jsonb;

COMMENT ON COLUMN public.animus_orders.icount_webhook_payload IS 'Raw iCount webhook payload from the most recent payment notification.';