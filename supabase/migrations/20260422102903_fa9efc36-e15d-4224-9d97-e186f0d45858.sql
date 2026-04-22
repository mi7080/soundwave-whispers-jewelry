-- Add referral fields to waitlist_leads
ALTER TABLE public.waitlist_leads
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.waitlist_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extra_discount_percent INTEGER NOT NULL DEFAULT 0;

-- Generate referral_code for any existing leads that don't have one
UPDATE public.waitlist_leads
SET referral_code = LOWER(REGEXP_REPLACE(encode(gen_random_bytes(6), 'base64'), '[^a-zA-Z0-9]', '', 'g'))
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
      new_code := LOWER(REGEXP_REPLACE(encode(gen_random_bytes(6), 'base64'), '[^a-zA-Z0-9]', '', 'g'));
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