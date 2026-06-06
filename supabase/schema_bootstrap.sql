-- ANIMUS consolidated schema bootstrap for a fresh Supabase project.
-- Paste into Dashboard -> SQL Editor -> Run. Replays all migrations in order.
-- Generated from supabase/migrations/ (30 files).

-- ============================================================
-- 20260406102145_4a12f052-c232-4bb9-a9d7-1b5ce095a034.sql
-- ============================================================

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


-- ============================================================
-- 20260406102848_149703af-8d1b-46fb-8200-3d6ea1ba2457.sql
-- ============================================================
ALTER TABLE public.animus_orders ADD COLUMN add_name_to_back BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 20260406222651_9422bdec-1f1f-4e9e-a61a-ee90f3ef1220.sql
-- ============================================================
ALTER TABLE public.animus_orders
  ADD COLUMN cloudinary_folder_url text,
  ADD COLUMN design_image_url text;

-- ============================================================
-- 20260406234509_d5f919dc-77b5-419d-8e62-45b31614f1f1.sql
-- ============================================================
-- Allow anyone (even unauthenticated) to read animus_orders by ID for public soul pages
CREATE POLICY "Public can read animus_orders for soul pages"
ON public.animus_orders
FOR SELECT
TO anon, authenticated
USING (true);


-- ============================================================
-- 20260407073524_c9d7034e-f339-4575-b55d-fe49facfede8.sql
-- ============================================================
CREATE POLICY "Anyone can update orders"
ON public.animus_orders
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

-- ============================================================
-- 20260407111216_66f398b9-82fb-4bb0-a6d1-7da75b5e26af.sql
-- ============================================================

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


-- ============================================================
-- 20260408190059_016f9bc2-dde4-4075-937f-6ce265f210d0.sql
-- ============================================================
ALTER TABLE public.animus_orders ADD COLUMN IF NOT EXISTS text_message text DEFAULT NULL;

-- ============================================================
-- 20260409212518_8ba4a02f-0f95-4090-accd-0629b52e0c3b.sql
-- ============================================================

CREATE TABLE public.waitlist_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit to waitlist"
ON public.waitlist_leads
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view waitlist"
ON public.waitlist_leads
FOR SELECT
USING (true);


-- ============================================================
-- 20260412073211_email_infra.sql
-- ============================================================
-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');


-- ============================================================
-- 20260419110131_529f4fbd-3596-4674-94a0-ead848fb110f.sql
-- ============================================================
-- 1. Role enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Add customer + fulfillment columns to orders
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'paid'
    CHECK (fulfillment_status IN ('paid', 'sent_to_shineon', 'shipped'));

-- 3. Lock down orders: replace public SELECT with admin-only
DROP POLICY IF EXISTS "Anyone can view orders" ON public.animus_orders;
DROP POLICY IF EXISTS "Public can read animus_orders for soul pages" ON public.animus_orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.animus_orders;

-- Soul pages need public read by id â€” keep that, but admins also full read
CREATE POLICY "Public can read orders for soul pages"
  ON public.animus_orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update orders"
  ON public.animus_orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Waitlist leads: add status + timestamps
ALTER TABLE public.waitlist_leads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'converted')),
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- Lock down leads: only admins can view + update
DROP POLICY IF EXISTS "Anyone can view waitlist" ON public.waitlist_leads;

CREATE POLICY "Admins can view waitlist"
  ON public.waitlist_leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update waitlist"
  ON public.waitlist_leads FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 20260419111134_d440f487-f496-4702-b249-668f5e9581bb.sql
-- ============================================================
ALTER TABLE public.animus_orders DROP COLUMN IF EXISTS shopify_order_id;

-- ============================================================
-- 20260419175444_ff814938-1f24-4e8d-b4c4-3641de8c0385.sql
-- ============================================================
ALTER TABLE public.animus_orders 
ADD COLUMN IF NOT EXISTS exported_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_animus_orders_created_at ON public.animus_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_animus_orders_exported_at ON public.animus_orders(exported_at);

-- ============================================================
-- 20260420002230_be9f8506-cefd-4499-8463-afd184d2eaa1.sql
-- ============================================================
-- 1. Add workflow + tracking + shipping columns to animus_orders
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_address1 TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_zip TEXT,
  ADD COLUMN IF NOT EXISTS shipping_country_code TEXT,
  ADD COLUMN IF NOT EXISTS icount_docnum TEXT,
  ADD COLUMN IF NOT EXISTS print_image_url TEXT;

-- Constrain workflow_status values
DO $$ BEGIN
  ALTER TABLE public.animus_orders
    ADD CONSTRAINT animus_orders_workflow_status_check
    CHECK (workflow_status IN ('new','paid','sent_to_production','shipped'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_animus_orders_workflow_status ON public.animus_orders(workflow_status);
CREATE INDEX IF NOT EXISTS idx_animus_orders_icount_docnum ON public.animus_orders(icount_docnum);

-- 2. Backfill workflow_status from existing status field
UPDATE public.animus_orders
SET workflow_status = CASE
  WHEN status = 'paid' THEN 'paid'
  WHEN exported_at IS NOT NULL THEN 'sent_to_production'
  ELSE 'new'
END
WHERE workflow_status = 'new';

-- 3. Grant admin role to mi7080@gmail.com if user exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'mi7080@gmail.com'
ON CONFLICT DO NOTHING;

-- 4. Auto-grant admin role on signup for mi7080@gmail.com
CREATE OR REPLACE FUNCTION public.grant_admin_to_known_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'mi7080@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_to_known_email();

-- 5. Storage policies for animus-production bucket (admin write, public read already exists since bucket is public)
DO $$ BEGIN
  CREATE POLICY "Admins can upload to animus-production"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'animus-production' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update animus-production"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'animus-production' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 20260420002240_bd167c4c-d1ab-431f-87c8-2a0a2b6aacd0.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_admin_to_known_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'mi7080@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 20260420005816_14343c08-2373-46be-9357-11609c4a5db2.sql
-- ============================================================
-- Cost settings (single-row config)
CREATE TABLE public.cost_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  shineon_unit_cost NUMERIC NOT NULL DEFAULT 15.00,
  transaction_fee_percent NUMERIC NOT NULL DEFAULT 2.9,
  transaction_fee_fixed NUMERIC NOT NULL DEFAULT 0.30,
  monthly_ad_spend NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT cost_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.cost_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cost settings"
  ON public.cost_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cost settings"
  ON public.cost_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert cost settings"
  ON public.cost_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_cost_settings_updated_at
  BEFORE UPDATE ON public.cost_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cost_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 20260420121309_1331d11b-fcf1-4872-aa6b-bb12064389a1.sql
-- ============================================================
UPDATE public.cost_settings SET currency = 'USD' WHERE id = 1; ALTER TABLE public.cost_settings ALTER COLUMN currency SET DEFAULT 'USD';

-- ============================================================
-- 20260420192353_58c02592-edd7-49a3-806d-fff9b995b495.sql
-- ============================================================
ALTER TABLE public.animus_orders ADD COLUMN IF NOT EXISTS icount_docnum_auto_detected boolean NOT NULL DEFAULT false;

-- ============================================================
-- 20260420200210_ec3af414-b80a-4945-a8a2-e8087f8daca4.sql
-- ============================================================
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

-- ============================================================
-- 20260422063801_12a3dae6-701b-4b6d-bce9-455463acacfe.sql
-- ============================================================
-- Allow anonymous and authenticated users to update orders that are still in pre-payment states.
-- Paid/fulfilled orders remain protected (only admins can update those, per existing policy).
CREATE POLICY "Anyone can update pre-payment orders"
ON public.animus_orders
FOR UPDATE
TO anon, authenticated
USING (status IN ('draft', 'pending', 'shipping_captured'))
WITH CHECK (status IN ('draft', 'pending', 'shipping_captured'));

-- ============================================================
-- 20260422102903_fa9efc36-e15d-4224-9d97-e186f0d45858.sql
-- ============================================================
-- Ensure pgcrypto exists before using gen_random_bytes().
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Add referral fields to waitlist_leads
ALTER TABLE public.waitlist_leads
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.waitlist_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extra_discount_percent INTEGER NOT NULL DEFAULT 0;

-- Generate referral_code for any existing leads that don't have one
UPDATE public.waitlist_leads
SET referral_code = LOWER(REGEXP_REPLACE(encode(extensions.gen_random_bytes(6), 'base64'), '[^a-zA-Z0-9]', '', 'g'))
WHERE referral_code IS NULL;

-- Function to auto-generate referral_code on insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  attempt INT := 0;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := LOWER(REGEXP_REPLACE(encode(extensions.gen_random_bytes(6), 'base64'), '[^a-zA-Z0-9]', '', 'g'));
      new_code := SUBSTRING(new_code FROM 1 FOR 8);
      IF NOT EXISTS (SELECT 1 FROM public.waitlist_leads WHERE referral_code = new_code) THEN
        NEW.referral_code := new_code;
        EXIT;
      END IF;
      attempt := attempt + 1;
      IF attempt > 10 THEN
        NEW.referral_code := SUBSTRING(NEW.id::text FROM 1 FOR 8);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.waitlist_leads;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.waitlist_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Function to increment referrer's count when a referred lead signs up
CREATE OR REPLACE FUNCTION public.handle_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    UPDATE public.waitlist_leads
    SET referral_count = referral_count + 1,
        extra_discount_percent = LEAST(100, (referral_count + 1) * 20)
    WHERE id = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_referral_signup ON public.waitlist_leads;
CREATE TRIGGER trg_handle_referral_signup
  AFTER INSERT ON public.waitlist_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_referral_signup();

-- RPC to look up a lead by referral_code (anonymous-safe; returns only id)
CREATE OR REPLACE FUNCTION public.lookup_referrer(_code TEXT)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.waitlist_leads WHERE referral_code = _code LIMIT 1;
$$;

-- Discount codes table
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES public.waitlist_leads(id) ON DELETE CASCADE,
  discount_percent INTEGER NOT NULL,
  description TEXT,
  used_at TIMESTAMPTZ,
  used_by_order UUID REFERENCES public.animus_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discount codes"
  ON public.discount_codes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read discount codes for validation"
  ON public.discount_codes FOR SELECT TO anon, authenticated
  USING (true);

-- Campaign send log
CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  lead_id UUID REFERENCES public.waitlist_leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  resend_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view campaign sends"
  ON public.campaign_sends FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert campaign sends"
  ON public.campaign_sends FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON public.campaign_sends(campaign_name);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_lead ON public.campaign_sends(lead_id);

-- ============================================================
-- 20260422102924_6d5ea691-45e6-4636-b588-5462106a5538.sql
-- ============================================================
-- Re-create functions with explicit search_path (already had it but linter still flags)
-- The trigger functions already have SET search_path = public; recreate to be safe with proper signatures

-- Tighten discount_codes: replace public select with admin-only; checkout will validate via RPC
DROP POLICY IF EXISTS "Anyone can read discount codes for validation" ON public.discount_codes;

CREATE POLICY "Admins can view discount codes"
  ON public.discount_codes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Public-safe RPC for validating a discount code at checkout (returns minimal info)
CREATE OR REPLACE FUNCTION public.validate_discount_code(_code TEXT)
RETURNS TABLE(valid BOOLEAN, discount_percent INTEGER, already_used BOOLEAN)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (dc.id IS NOT NULL) AS valid,
    COALESCE(dc.discount_percent, 0) AS discount_percent,
    (dc.used_at IS NOT NULL) AS already_used
  FROM public.discount_codes dc
  WHERE dc.code = UPPER(_code)
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, FALSE;
  END IF;
END;
$$;

-- Tighten campaign_sends insert policy (only service role; remove "public" role exposure)
DROP POLICY IF EXISTS "Service role can insert campaign sends" ON public.campaign_sends;

CREATE POLICY "Service role can insert campaign sends"
  ON public.campaign_sends FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================================
-- 20260425193529_7017d5cd-792c-4b44-b644-1f8c2335e18a.sql
-- ============================================================
ALTER TABLE public.animus_orders
ADD COLUMN IF NOT EXISTS icount_webhook_payload jsonb;

COMMENT ON COLUMN public.animus_orders.icount_webhook_payload IS 'Raw iCount webhook payload from the most recent payment notification.';

-- ============================================================
-- 20260425193721_db22bd73-a59e-46ae-981b-8a682506106c.sql
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'animus_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.animus_orders;
  END IF;
END $$;

-- ============================================================
-- 20260513000000_lock_icount_webhook_payload.sql
-- ============================================================
-- Restrict raw iCount webhook payload from anonymous reads.
--
-- The "Public can read orders for soul pages" policy on animus_orders uses USING (true)
-- because the customer's order UUID acts as a bearer token (SoulPage + Checkout both query
-- by id). That's pragmatic, but the raw iCount webhook payload may contain payment metadata
-- (card brand/last 4, transaction IDs, billing geo) we don't want exposed alongside the
-- public soul-page fields.
--
-- Postgres column-level grants are evaluated by PostgREST: anon will be blocked from
-- selecting this column even though the row-level policy permits the row.
--
-- âš ï¸  MAINTENANCE CONVENTION â€” READ BEFORE ADDING NEW COLUMNS âš ï¸
-- This migration revokes the blanket anon SELECT and re-grants it column-by-column.
-- Any column added to animus_orders after this migration is applied will be INVISIBLE
-- to anonymous callers (SoulPage, Checkout) until it is also added to the GRANT list
-- below. When adding a new column via migration:
--   1. Decide whether the column should be public (accessible by anon) or private.
--   2. If public: append the column name to the GRANT SELECT (...) block below and
--      deploy this migration update alongside the schema change.
--   3. If private (like icount_webhook_payload): leave it out of the GRANT list.

REVOKE SELECT ON public.animus_orders FROM anon;

-- Grant SELECT on every column except icount_webhook_payload.
-- Add new columns to this list when they're added to the table.
GRANT SELECT (
  id,
  pet_name,
  audio_url,
  pet_photo_url,
  soul_page_url,
  right_side_engraving,
  svg_content,
  waveform_data,
  status,
  created_at,
  updated_at,
  add_name_to_back,
  design_image_url,
  text_message,
  customer_name,
  customer_email,
  customer_phone,
  amount,
  fulfillment_status,
  workflow_status,
  tracking_number,
  tracking_updated_at,
  shipping_address1,
  shipping_address2,
  shipping_city,
  shipping_state,
  shipping_zip,
  shipping_country_code,
  icount_docnum,
  icount_docnum_auto_detected,
  print_image_url,
  soul_video_url,
  exported_at,
  billing_name,
  billing_address1,
  billing_address2,
  billing_city,
  billing_state,
  billing_zip,
  billing_country_code,
  billing_same_as_shipping,
  cloudinary_folder_url
) ON public.animus_orders TO anon;

-- Authenticated users (admins) keep full access via the existing "Admins can update orders"
-- policy + the default authenticated-role grants. Re-grant SELECT explicitly so changing
-- the anon grants above doesn't accidentally cascade.
GRANT SELECT ON public.animus_orders TO authenticated;

COMMENT ON COLUMN public.animus_orders.icount_webhook_payload IS
  'Raw iCount webhook payload. Service-role / admin read only â€” anonymous SELECT is revoked via column-level grant.';


-- ============================================================
-- 20260513000001_enable_pgcrypto.sql
-- ============================================================
-- Ensure pgcrypto is available for gen_random_bytes() used in referral code generation.
-- This extension must also be enabled in the Supabase dashboard
-- (Database â†’ Extensions â†’ pgcrypto) on first deploy.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 20260527000000_shineon_retry_columns.sql
-- ============================================================
-- ShineOn auto-retry tracking.
-- Transient submission failures (5xx/429/408/network) are retried automatically
-- on a backoff by the shineon-retry-sweep function; permanent failures are left
-- for manual handling in the admin "Needs Attention" view.

ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS shineon_retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shineon_last_error text,
  ADD COLUMN IF NOT EXISTS shineon_last_error_status int,
  ADD COLUMN IF NOT EXISTS shineon_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS shineon_next_retry_at timestamptz;

-- Fast lookup for the retry sweep: only rows still in error with a due retry.
CREATE INDEX IF NOT EXISTS idx_animus_orders_shineon_retry
  ON public.animus_orders (shineon_next_retry_at)
  WHERE status = 'shineon_error' AND shineon_next_retry_at IS NOT NULL;


-- ============================================================
-- 20260528000000_admin_archive_and_campaign_content.sql
-- ============================================================
-- Admin: soft-delete (archive) support for orders + leads, and editable campaign email content.

-- 1. Archive columns (soft delete = set archived_at; restore = NULL it)
ALTER TABLE public.animus_orders  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.waitlist_leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_animus_orders_archived_at  ON public.animus_orders(archived_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_leads_archived_at ON public.waitlist_leads(archived_at);

-- Admins already have UPDATE policies on both tables (see 20260419110131), so
-- toggling archived_at needs no new permissions.

-- 2. Editable campaign email content (Email 1 / Email 2 body copy)
CREATE TABLE IF NOT EXISTS public.campaign_email_content (
  id TEXT PRIMARY KEY CHECK (id IN ('email1', 'email2')),
  subject TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_email_content ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage campaign content"
    ON public.campaign_email_content FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role reads campaign content"
    ON public.campaign_email_content FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Seed with the current hardcoded copy (plain-text fields; layout stays in code)
INSERT INTO public.campaign_email_content (id, subject, fields) VALUES
(
  'email1',
  'We''re listeningâ€¦ and things are getting close ðŸ•Šï¸',
  jsonb_build_object(
    'heading', 'We hear you.',
    'body', E'Over the past weeks, we''ve read every comment, every message, every quiet request you''ve sent us. The voice notes you''ve saved on old phones. The laugh on a video that you can''t bring yourself to delete. The song that played the day they were born â€” or the day they left.\n\nWe''re listening. And we''re working â€” slowly, carefully â€” to make sure ANIMUS captures these moments with the reverence they deserve. Every soundwave engraving is being refined. Every detail of the Soul Page is being polished. We refuse to ship anything less than perfect.\n\nThe launch for our first 300 Founders is coming soon. You''ll be the first to know â€” and you''ll keep your 40% Founders discount, locked in.',
    'signature', E'Thank you for trusting us with this.\nâ€” The ANIMUS Team'
  )
),
(
  'email2',
  'Want your ANIMUS for free? (Or close to itâ€¦) ðŸŽ',
  jsonb_build_object(
    'heading', E'Your ANIMUS â€” for free.\nIt''s possible.',
    'intro', 'You already have 40% OFF as a Founder. Now we''re giving you a way to make your second pendant â€” for a parent, a partner, a sibling â€” almost free.',
    'cta_label', 'Share Your Link',
    'closing', 'Each friend who joins unlocks an extra discount code, sent to you when launch day arrives.',
    'signature', 'â€” The ANIMUS Team'
  )
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 20260531000000_shineon_variant_sku.sql
-- ============================================================
-- Per-order ShineOn variant SKU.
-- The pendant ships in 4 ShineOn variants on "The ANIMUS Soulwave Pendant"
-- (Partner CSV/API store): finish (steel/gold) Ã - back engraving (add_name_to_back).
-- The chosen SKU is resolved at checkout from the selected finish + add_name_to_back
-- and stored here, so fulfillment (icount-payment-webhook + admin CSV export) submits
-- the correct variant instead of a single hardcoded SKU.
--   steel / no engraving  -> SO-15845642
--   steel / engraving     -> SO-15845643
--   gold  / no engraving  -> SO-15845644
--   gold  / engraving     -> SO-15845645
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS shineon_sku text;


-- ============================================================
-- 20260601000000_variant_finish.sql
-- ============================================================
-- Persist the chosen pendant finish on the order.
-- The finish (steel/gold) used to live only in the checkout URL (?variant=), so an
-- order that never completed checkout (or lost the param) had no finish anywhere and
-- fulfillment fell back to steel â€” gold orders could ship the wrong SKU. Storing it
-- at order creation lets fulfillment resolve the correct finish Ã - engraving SKU even
-- when shineon_sku was never written.
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS variant_finish text;


-- ============================================================
-- 20260601000001_drop_shineon_sku.sql
-- ============================================================
-- Drop the stored ShineOn SKU. The SKU is derived data â€” a pure function of
-- variant_finish Ã - add_name_to_back â€” so it's resolved at fulfillment instead of
-- stored, leaving a single source of truth and nothing to keep in sync.
ALTER TABLE public.animus_orders
  DROP COLUMN IF EXISTS shineon_sku;



