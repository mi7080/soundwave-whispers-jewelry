
-- Create orders table for production asset tracking
CREATE TABLE public.animus_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopify_order_id TEXT,
  pet_name TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  pet_photo_url TEXT,
  soul_page_url TEXT NOT NULL,
  right_side_engraving TEXT,
  svg_content TEXT NOT NULL,
  waveform_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.animus_orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert orders (customer-facing, no auth)
CREATE POLICY "Anyone can create orders"
ON public.animus_orders
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read orders (admin dashboard, no auth for now)
CREATE POLICY "Anyone can view orders"
ON public.animus_orders
FOR SELECT
USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_animus_orders_updated_at
BEFORE UPDATE ON public.animus_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for audio archives
INSERT INTO storage.buckets (id, name, public) VALUES ('animus-production', 'animus-production', true);

CREATE POLICY "Anyone can upload to animus-production"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'animus-production');

CREATE POLICY "Anyone can read animus-production"
ON storage.objects
FOR SELECT
USING (bucket_id = 'animus-production');
