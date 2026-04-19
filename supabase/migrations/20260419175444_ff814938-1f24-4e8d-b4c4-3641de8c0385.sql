ALTER TABLE public.animus_orders 
ADD COLUMN IF NOT EXISTS exported_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_animus_orders_created_at ON public.animus_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_animus_orders_exported_at ON public.animus_orders(exported_at);