import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  FINALIZED_STATUSES,
  SHINEON_MAX_RETRIES,
  backoffMs,
  classifyShineOnFailure,
  extractOrderId,
  firstString,
  isFailedPayment,
  isSuccessfulPayment,
  normalizeString,
  pickShineOnPrintUrl,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHINEON_API_URL = "https://api.shineon.com/v1/orders";
// Fallback ShineOn SKU for orders created before per-variant SKUs were stored
// (animus_orders.shineon_sku is null). Normal orders carry their resolved variant
// SKU, set at checkout from finish × back engraving — see resolveShineonSku in
// src/config/product.ts. This fallback is steel + engraving on "The ANIMUS Soulwave
// Pendant" (Partner CSV/API store). Kept in sync with DEFAULT_SKU in
// src/pages/AdminOrders.tsx (the manual CSV-export fulfillment path).
//   steel/no SO-15845642 · steel/yes SO-15845643 · gold/no SO-15845644 · gold/yes SO-15845645
const SHINEON_SKU_FALLBACK = "SO-15845643";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookSecret = Deno.env.get("ICOUNT_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[iCount Webhook] ICOUNT_WEBHOOK_SECRET is not configured — rejecting request");
      return json({ error: "Webhook secret not configured" }, 500);
    }

    // Read body once — used for both secret detection and payload processing below.
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      // iCount may send form-encoded data
      try {
        const params = new URLSearchParams(rawBody);
        for (const [k, v] of params.entries()) body[k] = v;
      } catch { /* ignore */ }
    }

    // --- Diagnostic: log every header (mask secret-like values) ---
    const allHeaders = [...req.headers.entries()]
      .map(([k, v]) => {
        const lk = k.toLowerCase();
        if (lk.includes("secret") || lk.includes("key") || lk === "authorization") {
          return `${k}: ${v.length > 8 ? v.slice(0, 4) + "…" + v.slice(-4) : "****"}`;
        }
        return `${k}: ${v}`;
      })
      .join(" | ");
    const url = new URL(req.url);
    const queryKeys = [...url.searchParams.keys()].join(",");
    console.log(`[iCount Webhook] Headers: ${allHeaders}`);
    console.log(`[iCount Webhook] Query params: ${queryKeys || "(none)"}`);
    console.log(`[iCount Webhook] Body keys: ${Object.keys(body).join(",") || "(none)"}`);

    // --- Locate the secret from any of the places iCount might send it ---
    // 1. HTTP headers (Headers.get is case-insensitive per spec)
    const headerSecret =
      req.headers.get("x-icount-secret") ||
      req.headers.get("x-webhook-secret") ||
      req.headers.get("x-secret") ||
      req.headers.get("x-api-key");
    // 2. URL query parameter
    const querySecret =
      url.searchParams.get("secret") ||
      url.searchParams.get("key") ||
      url.searchParams.get("webhook_secret");
    // 3. Body field (some processors embed the secret in the payload)
    const bodySecret =
      body.secret || body.key || body.webhook_secret || body.icount_secret;

    const receivedSecret = headerSecret || querySecret || bodySecret || "";
    const receivedTrimmed = receivedSecret.trim();
    const expectedTrimmed = webhookSecret.trim();

    console.log(`[iCount Webhook] Secret source: ${headerSecret ? "header" : querySecret ? "query" : bodySecret ? "body" : "none"}, match: ${receivedTrimmed === expectedTrimmed}`);

    if (receivedTrimmed !== expectedTrimmed) {
      // Secret mismatch — allow admin-authenticated retries from the dashboard.
      const authHeader = req.headers.get("Authorization") || "";
      let isAdminRetry = false;
      if (authHeader.startsWith("Bearer ")) {
        try {
          const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
          const userClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: { user } } = await userClient.auth.getUser();
          if (user) {
            const { data: hasRole } = await supabase.rpc("has_role", {
              _user_id: user.id, _role: "admin",
            });
            if (hasRole) {
              isAdminRetry = true;
              console.log(`[iCount Webhook] Admin retry authorized (user: ${user.id})`);
            }
          }
        } catch (authErr) {
          console.warn("[iCount Webhook] Admin JWT check failed:", authErr);
        }
      }
      if (!isAdminRetry) {
        console.error(`[iCount Webhook] Unauthorized — secret source: ${headerSecret ? "header" : querySecret ? "query" : bodySecret ? "body" : "none"}`);
        return json({ error: "Unauthorized" }, 401);
      }
    }

    // body already parsed above — skip req.json()
    console.log("[iCount Webhook] Received payload:", JSON.stringify(body));

    const paymentStatus = normalizeString(body.status || body.payment_status || body.transaction_status || body.paymentStatus);
    const isSuccess = isSuccessfulPayment(body, paymentStatus);
    const isFailure = isFailedPayment(body, paymentStatus);
    const docnumEarly = firstString(body.docnum, body.doc_number, body.invoice_number, body.document_number);
    const customerEmailEarly = normalizeString(body.client_email || body.email || body.customer_email);
    const paymentAmountEarly = body.amount ?? body.total ?? body.total_paid ?? null;

    let orderId = extractOrderId(body);
    let order = orderId ? await fetchOrder(supabase, orderId) : null;

    if (!order) {
      const lookup = await secondaryOrderLookup(supabase, { docnum: docnumEarly, email: customerEmailEarly, amount: paymentAmountEarly });
      order = lookup.order;
      orderId = lookup.orderId;
      if (lookup.reason) console.log(`[iCount Webhook] Secondary lookup result: ${lookup.reason}`);
    }

    if (!orderId || !order) {
      console.error("[iCount Webhook] No matching order found for payload");
      return json({ success: true, skipped: true, reason: "no_matching_order" });
    }

    console.log(`[iCount Webhook] Order: ${orderId}, Status: ${paymentStatus || "unknown"}, Success: ${isSuccess}`);

    await supabase
      .from("animus_orders")
      .update({
        icount_webhook_payload: body,
        ...(docnumEarly ? { icount_docnum: String(docnumEarly), icount_docnum_auto_detected: false } : {}),
      } as any)
      .eq("id", orderId);

    if (!isSuccess) {
      if (FINALIZED_STATUSES.has(String(order.status))) {
        console.log(`[iCount Webhook] Ignoring non-success webhook for finalized order ${orderId}`);
        return json({ success: true, skipped: true, reason: "already_finalized", orderId });
      }

      if (isFailure) {
        await supabase
          .from("animus_orders")
          .update({ status: "payment_failed" } as any)
          .eq("id", orderId);
        return json({ success: true, payment_status: "failed", orderId });
      }

      return json({ success: true, skipped: true, reason: "payment_not_successful", orderId, payment_status: paymentStatus || null });
    }

    if (FINALIZED_STATUSES.has(String(order.status))) {
      console.log(`[iCount Webhook] Order ${orderId} is already finalized (${order.status}); skipping duplicate fulfillment`);
      return json({ success: true, skipped: true, reason: "already_finalized", orderId });
    }

    const customerNameEarly = body.client_name || [body.first_name, body.last_name].filter(Boolean).join(" ").trim() || null;

    const orderUpdate: Record<string, unknown> = {
      status: "paid",
      icount_webhook_payload: body,
      shipping_address1: body.address || body.street || null,
      shipping_city: body.city || null,
      shipping_zip: body.zip || body.postal_code || null,
      shipping_country_code: body.country_code || body.country || null,
    };
    if (docnumEarly) {
      orderUpdate.icount_docnum = String(docnumEarly);
      orderUpdate.icount_docnum_auto_detected = false;
    }
    if (customerEmailEarly) orderUpdate.customer_email = customerEmailEarly;
    if (customerNameEarly) orderUpdate.customer_name = customerNameEarly;
    if (paymentAmountEarly !== null && paymentAmountEarly !== "") {
      const amt = Number(paymentAmountEarly);
      if (!Number.isNaN(amt)) orderUpdate.amount = amt;
    }

    Object.keys(orderUpdate).forEach((k) => {
      if (orderUpdate[k] === null || orderUpdate[k] === undefined || orderUpdate[k] === "") delete orderUpdate[k];
    });

    const { data: paidRows, error: paidErr } = await supabase
      .from("animus_orders")
      .update(orderUpdate as any)
      .eq("id", orderId)
      .not("status", "in", "(paid,fulfilled,shineon_error)")
      .select("id");

    if (paidErr) {
      console.error("[iCount Webhook] Failed marking order paid:", paidErr);
      return json({ success: false, error: "Failed to mark order as paid" }, 500);
    }

    // If no rows updated, another concurrent webhook beat us to finalization — bail to preserve idempotency.
    if (!paidRows || paidRows.length === 0) {
      console.log(`[iCount Webhook] Order ${orderId} already finalized by concurrent webhook; skipping ShineOn`);
      return json({ success: true, skipped: true, reason: "already_finalized_concurrent", orderId });
    }

    console.log(`[iCount Webhook] ✓ Order ${orderId} marked as paid (docnum: ${docnumEarly || "none"})`);

    const { data: freshOrder, error: dbError } = await supabase
      .from("animus_orders")
      .select("id, design_image_url, print_image_url, pet_name, add_name_to_back, right_side_engraving, shineon_sku, soul_page_url, customer_email, customer_name, customer_phone, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_zip, shipping_country_code")
      .eq("id", orderId)
      .maybeSingle();

    if (dbError || !freshOrder) {
      console.error("[iCount Webhook] Order not found for ShineOn:", orderId);
      return json({ success: true, shineon_skipped: true, reason: "order_not_found", orderId });
    }

    // ShineOn's Acrylic template prints from a 1000x1788 SVG. pickShineOnPrintUrl prefers the
    // design_image_url SVG and only falls back to the legacy print_image_url PNG if it's missing.
    const { url: printAssetUrl, source: printAssetSource } = pickShineOnPrintUrl(freshOrder as any);

    if (!printAssetUrl) {
      console.error(`[iCount Webhook] BLOCKED: Order ${orderId} has no print_image_url or design_image_url — marked as shineon_error`);
      await supabase
        .from("animus_orders")
        .update({ status: "shineon_error" } as any)
        .eq("id", orderId);
      await supabase
        .from("email_send_log")
        .insert({
          template_name: "missing-design-url",
          recipient_email: freshOrder.customer_email || "unknown@animuswave.com",
          status: "error",
          error_message: `Order ${orderId} has neither print_image_url nor design_image_url — cannot submit to ShineOn`,
          metadata: { orderId },
        } as any);
      return json({ success: true, shineon_error: true, reason: "no_print_asset", orderId });
    }

    const shineonApiKey = Deno.env.get("SHINEON_API_KEY");
    if (!shineonApiKey) {
      console.error("[iCount Webhook] SHINEON_API_KEY not configured");
      return json({ success: true, shineon_skipped: true, reason: "missing_shineon_key", orderId });
    }

    const docnum = docnumEarly || `icount-${orderId}`;
    const sourceId = String(docnum);
    const customerEmailForShipping = body.client_email || body.email || freshOrder.customer_email || "";
    const pick = (...vals: any[]) => {
      for (const v of vals) {
        if (v !== null && v !== undefined && String(v).trim() !== "") return String(v);
      }
      return "";
    };
    // ShineOn's order API uses a single `name` field, not first/last.
    const recipientName = pick(
      body.client_name,
      freshOrder.customer_name,
      [body.first_name, body.last_name].filter(Boolean).join(" "),
    );
    const ship_city = pick(body.city, (freshOrder as any).shipping_city);
    const ship_country_code = pick(body.country_code, body.country, (freshOrder as any).shipping_country_code);
    let ship_state = pick(body.state, body.province, (freshOrder as any).shipping_state);
    // Israel-specific: ShineOn requires a province for some countries; Israel has none — fall back to city.
    if (ship_country_code.toUpperCase() === "IL" && !ship_state) {
      ship_state = ship_city;
    }
    // Per ShineOn Orders API: name, address1, city, zip, country_code are required;
    // province/address2/phone are accepted optional fields.
    const shippingAddress = {
      name: recipientName,
      address1: pick(body.address, body.street, (freshOrder as any).shipping_address1),
      address2: pick(body.address2, (freshOrder as any).shipping_address2),
      city: ship_city,
      province: ship_state,
      zip: pick(body.zip, body.postal_code, (freshOrder as any).shipping_zip),
      country_code: ship_country_code,
      phone: pick(body.phone, (freshOrder as any).customer_phone),
    };

    // Personalization goes in line_item.properties. The front soundwave (print_url)
    // is mandatory; the back engraving (the name) is sent only when the customer
    // opted in via add_name_to_back.
    const properties: Record<string, string> = { print_url: printAssetUrl };
    if ((freshOrder as any).add_name_to_back && freshOrder.pet_name) {
      properties["Engraving Line 1"] = String(freshOrder.pet_name);
    }

    // Variant SKU resolved at checkout (finish × engraving). Fall back for legacy
    // orders created before the shineon_sku column existed.
    const lineItemSku = (freshOrder as any).shineon_sku || SHINEON_SKU_FALLBACK;

    // ShineOn Orders API: everything is nested under an "order" object.
    // source_id = our unique order ref; store_line_item_id = per-line ref.
    const shineonPayload = {
      order: {
        source_id: sourceId,
        email: customerEmailForShipping,
        line_items: [
          {
            store_line_item_id: `${sourceId}-1`,
            sku: lineItemSku,
            quantity: 1,
            properties,
          },
        ],
        shipping_address: shippingAddress,
      },
    };

    console.log(`[iCount Webhook] Submitting to ShineOn v1 — source_id: ${sourceId}, sku: ${lineItemSku}${(freshOrder as any).shineon_sku ? "" : " (fallback)"}, print_url: ${printAssetUrl} (source: ${printAssetSource}), back_engraving: ${properties["Engraving Line 1"] ? "yes" : "no"}`);

    const shineonResponse = await fetch(SHINEON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${shineonApiKey}`,
      },
      body: JSON.stringify(shineonPayload),
    });

    const shineonResult = await shineonResponse.text();
    console.log(`[iCount Webhook] ShineOn response: ${shineonResponse.status} — ${shineonResult}`);

    if (!shineonResponse.ok) {
      console.error(`[iCount Webhook] ShineOn API error ${shineonResponse.status}: ${shineonResult}`);
      await supabase
        .from("email_send_log")
        .insert({
          template_name: "shineon-error",
          recipient_email: customerEmailForShipping || "unknown@animuswave.com",
          status: "error",
          error_message: `ShineOn ${shineonResponse.status}: ${shineonResult}`.slice(0, 4000),
          metadata: {
            orderId,
            docnum,
            request_payload: shineonPayload,
            response_status: shineonResponse.status,
            response_body: shineonResult,
          },
        } as any);

      // Auto-retry policy: transient failures (5xx/429/408/network) get scheduled
      // for an automatic retry on a backoff; permanent failures (other 4xx) do not.
      const kind = classifyShineOnFailure(shineonResponse.status, false);
      const { data: rc } = await supabase
        .from("animus_orders")
        .select("shineon_retry_count")
        .eq("id", orderId)
        .maybeSingle();
      const attempt = Number((rc as any)?.shineon_retry_count ?? 0);
      const nextAttempt = attempt + 1;
      const willRetry = kind === "transient" && nextAttempt < SHINEON_MAX_RETRIES;
      const nextRetryAt = willRetry
        ? new Date(Date.now() + backoffMs(attempt)).toISOString()
        : null;

      await supabase
        .from("animus_orders")
        .update({
          status: "shineon_error",
          shineon_retry_count: nextAttempt,
          shineon_last_error: `ShineOn ${shineonResponse.status}: ${shineonResult}`.slice(0, 4000),
          shineon_last_error_status: shineonResponse.status,
          shineon_last_attempt_at: new Date().toISOString(),
          shineon_next_retry_at: nextRetryAt,
        } as any)
        .eq("id", orderId)
        .eq("status", "paid");

      console.log(`[iCount Webhook] ShineOn ${kind} failure for ${orderId} (attempt ${nextAttempt}/${SHINEON_MAX_RETRIES})${willRetry ? ` — auto-retry at ${nextRetryAt}` : " — no auto-retry"}`);

      return json({ success: true, shineon_error: true, status: shineonResponse.status, body: shineonResult, orderId, retry_kind: kind, will_retry: willRetry });
    }

    await supabase
      .from("animus_orders")
      .update({ status: "fulfilled", shineon_next_retry_at: null } as any)
      .eq("id", orderId)
      .eq("status", "paid");

    // Parse the ShineOn order ref for traceability. NOTE: the synchronous create
    // response has NO tracking number — it returns status "on_hold"; tracking is
    // delivered later via the shipment_notification_url callback (TASKS.md A4).
    let shineonOrder: any = null;
    try { shineonOrder = JSON.parse(shineonResult)?.order ?? null; } catch { /* non-JSON body */ }
    console.log(`[iCount Webhook] ✓ Order ${orderId} sent to ShineOn (shineon: ${shineonOrder?.name || shineonOrder?.id || "?"}, status: ${shineonOrder?.status || "?"})`);

    const shipEmail = body.client_email || body.email;
    const shipName = body.client_name || body.first_name || "";
    const trackingUrl = shineonOrder?.tracking_url; // absent in create response; populated only once ShineOn ships (A4)
    if (shipEmail) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "shipping-notification",
            recipientEmail: shipEmail,
            idempotencyKey: `shipping-${orderId}`,
            templateData: {
              name: shipName,
              orderId,
              petName: freshOrder?.pet_name || "",
              trackingUrl: trackingUrl || "",
            },
          },
        });
        console.log(`[iCount Webhook] ✓ Shipping email queued for ${shipEmail}`);
      } catch (emailErr) {
        console.error("[iCount Webhook] Shipping email failed (non-blocking):", emailErr);
      }
    }

    return json({ success: true, shineon_submitted: true, orderId });
  } catch (err: any) {
    console.error("[iCount Webhook] Unexpected error:", err);
    // Best-effort log to email_send_log so failures surface in the admin UI.
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseKey) {
        const logger = createClient(supabaseUrl, supabaseKey);
        await logger
          .from("email_send_log")
          .insert({
            template_name: "icount-webhook-error",
            recipient_email: "system@animuswave.com",
            status: "error",
            error_message: String(err?.message || err || "Unknown error").slice(0, 4000),
            metadata: { stack: String(err?.stack || "").slice(0, 4000) },
          } as any);
      }
    } catch (logErr) {
      console.error("[iCount Webhook] Failed to write error log:", logErr);
    }
    // Return 200 so iCount doesn't retry storms — we already logged the failure.
    return json({ success: true, error: err?.message || "Unknown error" });
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchOrder(supabase: any, orderId: string) {
  const { data, error } = await supabase
    .from("animus_orders")
    .select("id, status, design_image_url, pet_name, soul_page_url, customer_email, customer_name, icount_docnum")
    .eq("id", orderId)
    .maybeSingle();
  if (error) console.error("[iCount Webhook] Order lookup failed:", error);
  return data || null;
}

async function secondaryOrderLookup(supabase: any, input: { docnum: string | null; email: string; amount: unknown }) {
  if (input.docnum) {
    const { data } = await supabase
      .from("animus_orders")
      .select("id, status, design_image_url, pet_name, soul_page_url, customer_email, customer_name, icount_docnum")
      .eq("icount_docnum", String(input.docnum))
      .maybeSingle();
    if (data) return { orderId: data.id, order: data, reason: "matched_docnum" };
  }

  if (input.email) {
    let query = supabase
      .from("animus_orders")
      .select("id, status, design_image_url, pet_name, soul_page_url, customer_email, customer_name, icount_docnum, amount, created_at")
      .eq("customer_email", input.email)
      .in("status", ["shipping_captured", "payment_pending", "pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(5);

    const { data } = await query;
    const rows = data || [];
    if (rows.length > 0) {
      const webhookAmount = Number(input.amount);
      const matchedByAmount = Number.isFinite(webhookAmount)
        ? rows.find((row: any) => Number(row.amount) === webhookAmount)
        : null;
      const selected = matchedByAmount || rows[0];
      return { orderId: selected.id, order: selected, reason: matchedByAmount ? "matched_email_amount" : "matched_recent_email" };
    }
  }

  return { orderId: null, order: null, reason: "no_secondary_match" };
}
