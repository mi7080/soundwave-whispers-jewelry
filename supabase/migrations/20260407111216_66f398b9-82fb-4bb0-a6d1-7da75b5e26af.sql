
-- Create soul_assets bucket for customer photos and audio
INSERT INTO storage.buckets (id, name, public) VALUES ('soul_assets', 'soul_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create production_assets bucket for SVGs and design files
INSERT INTO storage.buckets (id, name, public) VALUES ('production_assets', 'production_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for soul_assets
CREATE POLICY "Public read soul_assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'soul_assets');

-- Public upload to soul_assets
CREATE POLICY "Public upload soul_assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'soul_assets');

-- Public read access for production_assets
CREATE POLICY "Public read production_assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'production_assets');

-- Public upload to production_assets
CREATE POLICY "Public upload production_assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'production_assets');
