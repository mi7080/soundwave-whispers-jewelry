// ShineOn Orders API dry-run - validates key→store, SKU, and payload format
// WITHOUT touching iCount or payments. Creates a real (unpaid, on-hold) order in
// ShineOn that you can cancel from the dashboard afterward.
//
// Usage (PowerShell):
//   $env:SHINEON_API_KEY="<partner-store-key>"; node scripts/shineon-test-order.mjs
//   $env:SHINEON_API_KEY="<key>"; node scripts/shineon-test-order.mjs SO-15845645   # test a specific SKU
//
// The 4 live SKUs (The ANIMUS Soulwave Pendant, Partner CSV/API store):
//   steel/no  SO-15845642 · steel/yes SO-15845643 · gold/no SO-15845644 · gold/yes SO-15845645

const API_URL = "https://api.shineon.com/v1/orders";
const KEY = process.env.SHINEON_API_KEY;
const SKU = process.argv[2] || "SO-15845643"; // default: steel + engraving

if (!KEY) {
  console.error("✗ Set SHINEON_API_KEY first.  PowerShell:  $env:SHINEON_API_KEY=\"<key>\"");
  process.exit(1);
}

// Unique-ish test id without Date.now in app code; fine for a manual script.
const sourceId = `TEST-${Math.floor(Date.now() / 1000)}`;

// Engraving (back text) only applies to the "/Yes" variant SKUs. The "/No" SKUs
// must NOT carry engraving text, mirroring the production webhook's add_name_to_back gate.
const ENGRAVED_SKUS = new Set(["SO-15845643", "SO-15845645"]);
// This template requires a hosted SVG (1000x1788, RGB, solid black). Host the
// placeholder at scripts/assets/shineon-placeholder-1000x1788.svg somewhere public
// (e.g. a Supabase public storage bucket) and pass its URL via PLACEHOLDER_PRINT_URL.
const PRINT_URL =
  process.env.PLACEHOLDER_PRINT_URL ||
  "https://upload.wikimedia.org/wikipedia/commons/0/02/SVG_logo.svg";
const properties = { print_url: PRINT_URL };
if (ENGRAVED_SKUS.has(SKU)) {
  properties["Engraving Line 1"] = "TEST DO NOT FULFILL";
}

const payload = {
  order: {
    source_id: sourceId,
    email: "test@animuswaves.com",
    // Required by ShineOn - they POST tracking here once the order ships.
    shipment_notification_url: "https://animuswaves.com/api/shineon-shipment",
    line_items: [
      {
        store_line_item_id: `${sourceId}-1`,
        sku: SKU,
        quantity: 1,
        properties,
      },
    ],
    shipping_address: {
      name: "Test Buyer",
      address1: "1600 Amphitheatre Parkway",
      city: "Mountain View",
      province: "CA",
      zip: "94043",
      country_code: "US",
      phone: "5555555555",
    },
  },
};

console.log(`→ POST ${API_URL}`);
console.log(`  source_id: ${sourceId}  sku: ${SKU}`);

const res = await fetch(API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${KEY}`,
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
console.log(`\n← HTTP ${res.status} ${res.statusText}`);
console.log(text);

if (res.ok) {
  console.log(`\n✓ ShineOn accepted the order. Check the Partner store → Orders for ${sourceId}, then CANCEL it.`);
} else if (res.status === 401 || res.status === 403) {
  console.log(`\n✗ Auth failed - key is wrong or points to a different store.`);
} else if (res.status === 422 || res.status === 400) {
  console.log(`\n✗ Payload/SKU rejected - read the message above (likely SKU not in this store, or missing field).`);
}
