-- Security + integrity hardening for animus_orders.
--
-- 1. Stop anonymous enumeration of customer CONTACT PII.
--    The "Public can read orders for soul pages" policy is USING (true) because the
--    order UUID acts as a bearer token (SoulPage / Checkout / ThankYou query by id).
--    20260513 revoked the blanket anon SELECT and re-granted it column-by-column, but
--    that list still included customer_email, customer_phone, and the full shipping/
--    billing address. With USING (true), anon can therefore run an unfiltered
--    `select customer_email, shipping_address1, ... from animus_orders` and dump the
--    entire customer list with only the public anon key.
--
--    Fix: re-grant the anon SELECT WITHOUT the contact-PII columns. The buyer's own
--    return-to-checkout repopulate path (the only anon flow that needs those columns)
--    is served instead by get_checkout_order(uuid) below, which returns exactly one
--    row for a known id and cannot be used to enumerate.
--
--    Columns kept public (needed by ProductSection upsert .select, SoulPage, ThankYou,
--    and the status polls): id, soul-page fields, status, amount, customer_name, etc.
--    Columns removed from anon: customer_email, customer_phone, all shipping_* and
--    billing_* address fields, icount_docnum.

REVOKE SELECT ON public.animus_orders FROM anon;

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
  amount,
  variant_finish,
  fulfillment_status,
  workflow_status,
  tracking_number,
  tracking_url,
  tracking_carrier,
  tracking_updated_at,
  print_image_url,
  soul_video_url,
  exported_at,
  billing_same_as_shipping,
  cloudinary_folder_url
) ON public.animus_orders TO anon;

-- Buyer return-to-checkout repopulate: returns the single order's contact + shipping
-- fields for a known id. SECURITY DEFINER so it bypasses the (now PII-restricted) anon
-- column grants, but it filters by id and returns at most one row, so it cannot
-- enumerate the table the way `USING (true)` + a broad column grant could.
CREATE OR REPLACE FUNCTION public.get_checkout_order(p_id uuid)
RETURNS TABLE (
  id uuid,
  pet_name text,
  add_name_to_back boolean,
  design_image_url text,
  pet_photo_url text,
  status text,
  variant_finish text,
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping_address1 text,
  shipping_address2 text,
  shipping_city text,
  shipping_state text,
  shipping_zip text,
  shipping_country_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, pet_name, add_name_to_back, design_image_url, pet_photo_url, status,
    variant_finish, customer_name, customer_email, customer_phone,
    shipping_address1, shipping_address2, shipping_city, shipping_state,
    shipping_zip, shipping_country_code
  FROM public.animus_orders
  WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION public.get_checkout_order(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_checkout_order(uuid) TO anon, authenticated;

-- 2. Indexes for the fulfillment hot paths. The iCount webhook gates on status='paid',
--    the retry sweep on status='shineon_error', and the webhook's fallback order match
--    scans by customer_email - all previously unindexed.
CREATE INDEX IF NOT EXISTS idx_animus_orders_status
  ON public.animus_orders (status);

CREATE INDEX IF NOT EXISTS idx_animus_orders_customer_email_lower
  ON public.animus_orders (lower(customer_email));

-- 3. A paid/fulfilled/shipped order must carry the contact + amount it needs to be
--    fulfilled and accounted for. NOT VALID so existing rows are not retro-checked
--    (the webhook historically defaulted a missing email); enforced for new writes.
ALTER TABLE public.animus_orders
  DROP CONSTRAINT IF EXISTS animus_orders_paid_requires_contact;
ALTER TABLE public.animus_orders
  ADD CONSTRAINT animus_orders_paid_requires_contact
  CHECK (
    status NOT IN ('paid', 'fulfilled', 'shipped')
    OR (customer_email IS NOT NULL AND amount IS NOT NULL)
  )
  NOT VALID;
