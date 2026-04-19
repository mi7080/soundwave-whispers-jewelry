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

-- Soul pages need public read by id — keep that, but admins also full read
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