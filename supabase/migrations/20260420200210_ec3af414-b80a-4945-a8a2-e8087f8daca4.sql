-- Add new columns to animus_orders for shipping form + video
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS shipping_address2 text,
  ADD COLUMN IF NOT EXISTS shipping_state text,
  ADD COLUMN IF NOT EXISTS billing_same_as_shipping boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS billing_name text,
  ADD COLUMN IF NOT EXISTS billing_address1 text,
  ADD COLUMN IF NOT EXISTS billing_address2 text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_state text,
  ADD COLUMN IF NOT EXISTS billing_zip text,
  ADD COLUMN IF NOT EXISTS billing_country_code text,
  ADD COLUMN IF NOT EXISTS soul_video_url text;

-- Create soul_videos bucket (100 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'soul_videos',
  'soul_videos',
  true,
  104857600,
  ARRAY['video/mp4','video/quicktime','video/webm','video/x-matroska','video/x-m4v']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read
CREATE POLICY "Public can read soul videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'soul_videos');

-- Anyone can upload (matches soul_assets pattern for pre-purchase uploads)
CREATE POLICY "Anyone can upload soul videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'soul_videos');

-- Anyone can update their uploads (used for upsert)
CREATE POLICY "Anyone can update soul videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'soul_videos');