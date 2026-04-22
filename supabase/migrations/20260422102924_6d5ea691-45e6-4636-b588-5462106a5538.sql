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