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
-- ⚠️  MAINTENANCE CONVENTION — READ BEFORE ADDING NEW COLUMNS ⚠️
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
  'Raw iCount webhook payload. Service-role / admin read only — anonymous SELECT is revoked via column-level grant.';
