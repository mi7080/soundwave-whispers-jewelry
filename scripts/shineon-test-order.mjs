// ShineOn Orders API dry-run — validates key→store, SKU, and payload format
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

const payload = {
  order: {
    source_id: sourceId,
    email: "test@animuswave.com",
    line_items: [
      {
        store_line_item_id: `${sourceId}-1`,
        sku: SKU,
        quantity: 1,
        properties: {
          // A small public PNG so ShineOn's renderer has a valid raster to fetch.
          print_url: "https://res.cloudinary.com/demo/image/upload/sample.png",
          "Engraving Line 1": "TEST DO NOT FULFILL",
        },
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
  console.log(`\n✗ Auth failed — key is wrong or points to a different store.`);
} else if (res.status === 422 || res.status === 400) {
  console.log(`\n✗ Payload/SKU rejected — read the message above (likely SKU not in this store, or missing field).`);
}
