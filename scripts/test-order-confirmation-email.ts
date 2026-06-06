// Test the post-payment order-confirmation email (with next-purchase coupon).
//
// Fetches a REAL order and invokes the deployed send-transactional-email function
// with the SAME templateData the webhook sends. Routes to a test inbox by default
// so it never emails a real customer.
//
// Usage (PowerShell), env from your functions .env:
//   npx tsx --env-file=supabase/functions/.env scripts/test-order-confirmation-email.ts <orderId> [recipientOverride]
//
// recipientOverride defaults to adir.yed@gmail.com. Pass "real" to send to the
// order's actual customer_email.

import { createClient } from "@supabase/supabase-js";

const orderId = process.argv[2];
const recipientArg = process.argv[3] || "adir.yed@gmail.com";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!orderId) {
  console.error("✗ Pass an order id: npx tsx --env-file=supabase/functions/.env scripts/test-order-confirmation-email.ts <orderId> [recipientOverride|real]");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("✗ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const { data: order, error } = await supabase
  .from("animus_orders")
  .select("id, customer_email, customer_name, pet_name, amount, status, soul_page_url")
  .eq("id", orderId)
  .maybeSingle();

if (error || !order) {
  console.error(`✗ Order ${orderId} not found:`, error?.message ?? "no row");
  process.exit(1);
}

const recipient = recipientArg === "real" ? order.customer_email : recipientArg;
if (!recipient) {
  console.error("✗ No recipient (order has no customer_email and no override given).");
  process.exit(1);
}

const templateData = {
  name: order.customer_name || "",
  orderId: order.id,
  amount: order.amount != null ? String(order.amount) : "",
  petName: order.pet_name || "",
  soulPageUrl: order.soul_page_url || "",
  couponCode: process.env.NEXT_PURCHASE_COUPON || "d12ce1",
  couponPercent: 15,
};

console.log(`Order ${orderId} (status: ${order.status}) → sending order-confirmation to ${recipient}`);
console.log(JSON.stringify(templateData, null, 2));

const { data, error: invokeError } = await supabase.functions.invoke("send-transactional-email", {
  body: {
    templateName: "order-confirmation",
    recipientEmail: recipient,
    // Unique per run so Resend's 24h idempotency cache doesn't suppress re-tests.
    idempotencyKey: `test-order-confirmation-${orderId}-${Date.now()}`,
    templateData,
  },
});

if (invokeError) {
  console.error("✗ Invoke failed:", invokeError.message ?? invokeError);
  process.exit(1);
}
console.log("← Function response:", JSON.stringify(data));
console.log(data?.queued ? "\n✓ Queued. Email will be sent by process-email-queue dispatcher." : "\n⚠ Not queued - see response above.");
