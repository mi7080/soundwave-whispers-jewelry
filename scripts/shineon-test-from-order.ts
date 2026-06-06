// Real-flow ShineOn test - mirrors the production webhook exactly.
//
// Fetches a REAL order from your Supabase DB and builds the ShineOn payload with
// the SAME helpers the webhook uses (pickShineOnPrintUrl, resolveLineItemSku,
// buildShineonProperties). The only thing skipped vs production is iCount/payment.
//
// Usage (PowerShell), env from your functions .env:
//   npx tsx --env-file=supabase/functions/.env scripts/shineon-test-from-order.ts <orderId>
//   npx tsx --env-file=supabase/functions/.env scripts/shineon-test-from-order.ts <orderId> --dry
//
// --dry prints the payload without POSTing to ShineOn.

import { createClient } from "@supabase/supabase-js";
import {
  pickShineOnPrintUrl,
  resolveLineItemSku,
  buildShineonProperties,
} from "../supabase/functions/icount-payment-webhook/helpers.ts";

const SHINEON_API_URL = "https://api.shineon.com/v1/orders";

const orderId = process.argv[2];
const dry = process.argv.includes("--dry");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHINEON_KEY = process.env.SHINEON_API_KEY;

if (!orderId) {
  console.error("✗ Pass an order id:  npx tsx --env-file=supabase/functions/.env scripts/shineon-test-from-order.ts <orderId> [--dry]");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("✗ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from env file.");
  process.exit(1);
}
if (!dry && !SHINEON_KEY) {
  console.error("✗ SHINEON_API_KEY missing (needed unless --dry).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const { data: order, error } = await supabase
  .from("animus_orders")
  .select(
    "id, icount_docnum, customer_email, customer_name, customer_phone, pet_name, add_name_to_back, variant_finish, design_image_url, print_image_url, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_zip, shipping_country_code",
  )
  .eq("id", orderId)
  .maybeSingle();

if (error || !order) {
  console.error(`✗ Order ${orderId} not found:`, error?.message ?? "no row");
  process.exit(1);
}

// --- Build the payload exactly as the webhook does ---
const { url: printUrl, source: printSource } = pickShineOnPrintUrl(order as any);
if (!printUrl) {
  console.error("✗ Order has no print asset (design_image_url / print_image_url). Webhook would mark shineon_error.");
  process.exit(1);
}
if (printSource !== "design_image_url") {
  console.warn(`⚠ print asset came from ${printSource} - this template requires an SVG (design_image_url). ShineOn will likely 406.`);
}

const sku = resolveLineItemSku(order as any);
const properties = buildShineonProperties(order as any, printUrl);

const sourceId = String(order.icount_docnum || `icount-${order.id}`);

// Use the order's real shipping data, but fall back to a valid US test address for
// any blank field so the test never fails on missing address data (it's a ShineOn /
// SVG / SKU check, not an address check).
const addr = {
  name: order.customer_name || "Test Buyer",
  address1: order.shipping_address1 || "1600 Amphitheatre Parkway",
  address2: order.shipping_address2 || "",
  city: order.shipping_city || "Mountain View",
  province: order.shipping_state || "CA",
  zip: order.shipping_zip || "94043",
  country_code: order.shipping_country_code || "US",
  phone: order.customer_phone || "5555555555",
};
if (addr.country_code.toUpperCase() === "IL" && !addr.province) addr.province = addr.city; // mirror webhook IL fallback

const payload = {
  order: {
    source_id: sourceId,
    email: order.customer_email || "test@animuswave.com",
    shipment_notification_url: `${SUPABASE_URL}/functions/v1/shineon-shipment-notification`,
    line_items: [
      { store_line_item_id: `${sourceId}-1`, sku, quantity: 1, properties },
    ],
    shipping_address: addr,
  },
};

console.log(`Order ${orderId} → sku ${sku} (finish: ${order.variant_finish || "steel?"}), print ${printSource}, engraving ${properties["Engraving Line 1"] ? "yes" : "no"}`);
console.log(JSON.stringify(payload, null, 2));

if (dry) {
  console.log("\n(--dry) Not sent. Payload above is exactly what the webhook would POST.");
  process.exit(0);
}

const res = await fetch(SHINEON_API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${SHINEON_KEY}`,
  },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log(`\n← HTTP ${res.status} ${res.statusText}\n${text}`);
if (res.ok) console.log(`\n✓ Accepted. Check Partner store → Orders for ${sourceId}, then CANCEL it.`);
