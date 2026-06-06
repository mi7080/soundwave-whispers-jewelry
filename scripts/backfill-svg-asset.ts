// Backfill an order's SVG print asset from svg_content (already in the DB) into
// storage, and set design_image_url to its public URL - mirrors what
// upload-production-assets does, but runnable locally with the service-role key
// (no function deploy needed). Use for test orders, or to repair any order whose
// design_image_url is null.
//
// Usage (PowerShell):
//   npx tsx --env-file=supabase/functions/.env scripts/backfill-svg-asset.ts <orderId>

import { createClient } from "@supabase/supabase-js";

const orderId = process.argv[2];
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!orderId) {
  console.error("✗ Pass an order id: npx tsx --env-file=supabase/functions/.env scripts/backfill-svg-asset.ts <orderId>");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("✗ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const { data: order, error } = await supabase
  .from("animus_orders")
  .select("id, svg_content, design_image_url")
  .eq("id", orderId)
  .maybeSingle();

if (error || !order) {
  console.error(`✗ Order ${orderId} not found:`, error?.message ?? "no row");
  process.exit(1);
}

const svg = (order.svg_content ?? "").trim();
if (svg.length < 50 || !/<svg[\s>][\s\S]*<\/svg>/i.test(svg)) {
  console.error(`✗ Order ${orderId} has no usable svg_content (len ${svg.length}). Nothing to upload.`);
  process.exit(1);
}

// Canonical path - same as upload-production-assets.
const svgPath = `${orderId}/final_engraving_design.svg`;
const { error: upErr } = await supabase.storage
  .from("production_assets")
  .upload(svgPath, new TextEncoder().encode(svg), { contentType: "image/svg+xml", upsert: true });

if (upErr) {
  console.error(`✗ SVG upload failed: ${upErr.message}`);
  process.exit(1);
}

const { data: pub } = supabase.storage.from("production_assets").getPublicUrl(svgPath);
const svgUrl = pub?.publicUrl || "";

const { error: updErr } = await supabase
  .from("animus_orders")
  .update({ design_image_url: svgUrl })
  .eq("id", orderId);

if (updErr) {
  console.error(`✗ DB update failed: ${updErr.message}`);
  process.exit(1);
}

console.log(`✓ Uploaded SVG and set design_image_url for ${orderId}:`);
console.log(`  ${svgUrl}`);
console.log(`\nVerify it's public (open in browser), then run the real-flow test:`);
console.log(`  npx tsx --env-file=supabase/functions/.env scripts/shineon-test-from-order.ts ${orderId} --dry`);
