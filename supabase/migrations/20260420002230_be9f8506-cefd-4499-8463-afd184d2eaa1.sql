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