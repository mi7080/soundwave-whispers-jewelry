import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHINEON_API_URL = "https://api.shineon.com/v1/orders";
const SHINEON_SKU = "SO-15845645";
const FINALIZED_STATUSES = new Set(["paid", "fulfilled", "shineon_error"]);
const SUCCESS_STATUSES = new Set(["success", "approved", "paid", "completed", "complete", "authorized", "captured"]);
const FAILURE_STATUSES = new Set(["failed", "failure", "declined", "cancelled", "canceled", "error", "void"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("ICOUNT_WEBHOOK_SECRET");
    const receivedSecret = req.headers.get("X-iCount-Secret") || req.headers.get("x-icount-secret");

    if (webhookSecret && receivedSecret !== webhookSecret) {
      console.error("[iCount Webhook] Invalid secret header");
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
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
      workflow_status: "paid",
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

    const { error: paidErr } = await supabase
      .from("animus_orders")
      .update(orderUpdate as any)
      .eq("id", orderId)
      .not("status", "in", "(paid,fulfilled,shineon_error)");

    if (paidErr) {
      console.error("[iCount Webhook] Failed marking order paid:", paidErr);
      return json({ success: false, error: "Failed to mark order as paid" }, 500);
    }

    console.log(`[iCount Webhook] ✓ Order ${orderId} marked as paid (docnum: ${docnumEarly || "none"})`);

    const { data: freshOrder, error: dbError } = await supabase
      .from("animus_orders")
      .select("id, design_image_url, pet_name, soul_page_url, customer_email, customer_name, customer_phone, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_zip, shipping_country_code")
      .eq("id", orderId)
      .maybeSingle();

    if (dbError || !freshOrder) {
      console.error("[iCount Webhook] Order not found for ShineOn:", orderId);
      return json({ success: true, shineon_skipped: true, reason: "order_not_found", orderId });
    }

    if (!freshOrder.design_image_url) {
      console.error(`[iCount Webhook] BLOCKED: Order ${orderId} has no design_image_url — marked as shineon_error`);
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
          error_message: `Order ${orderId} has no design_image_url — cannot submit to ShineOn`,
          metadata: { orderId },
        } as any);
      return json({ success: true, shineon_error: true, reason: "no_design_url", orderId });
    }

    const shineonApiKey = Deno.env.get("SHINEON_API_KEY");
    if (!shineonApiKey) {
      console.error("[iCount Webhook] SHINEON_API_KEY not configured");
      return json({ success: true, shineon_skipped: true, reason: "missing_shineon_key", orderId });
    }

    const docnum = docnumEarly || `icount-${orderId}`;
    const fullName = body.client_name || freshOrder.customer_name || "";
    const customerEmailForShipping = body.client_email || body.email || freshOrder.customer_email || "";
    const pick = (...vals: any[]) => {
      for (const v of vals) {
        if (v !== null && v !== undefined && String(v).trim() !== "") return String(v);
      }
      return "";
    };
    const ship_city = pick(body.city, (freshOrder as any).shipping_city);
    const ship_country_code = pick(body.country_code, body.country, (freshOrder as any).shipping_country_code);
    let ship_state = pick(body.state, body.province, (freshOrder as any).shipping_state);
    // Israel-specific: ShineOn requires province; Israel has none — fall back to city
    if (ship_country_code.toUpperCase() === "IL" && !ship_state) {
      ship_state = ship_city;
    }
    const shippingAddress = {
      first_name: fullName.split(" ")[0] || body.first_name || "",
      last_name: fullName.split(" ").slice(1).join(" ") || body.last_name || "",
      address1: pick(body.address, body.street, (freshOrder as any).shipping_address1),
      address2: pick(body.address2, (freshOrder as any).shipping_address2),
      city: ship_city,
      province: ship_state,
      province_code: body.province_code || "",
      country: pick(body.country, (freshOrder as any).shipping_country_code),
      country_code: ship_country_code,
      zip: pick(body.zip, body.postal_code, (freshOrder as any).shipping_zip),
      phone: pick(body.phone, (freshOrder as any).customer_phone),
      email: customerEmailForShipping,
    };

    const shineonPayload = {
      order_number: String(docnum),
      shipping_address: shippingAddress,
      line_items: [
        {
          sku: SHINEON_SKU,
          quantity: 1,
          print_url: freshOrder.design_image_url,
        },
      ],
    };

    console.log(`[iCount Webhook] Submitting to ShineOn v1 — order_number: ${docnum}, sku: ${SHINEON_SKU}, print_url: ${freshOrder.design_image_url}`);

    const shineonResponse = await fetch(SHINEON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${shineonApiKey}`,
        "X-API-KEY": shineonApiKey,
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

      await supabase
        .from("animus_orders")
        .update({ status: "shineon_error" } as any)
        .eq("id", orderId)
        .eq("status", "paid");

      return json({ success: true, shineon_error: true, status: shineonResponse.status, body: shineonResult, orderId });
    }

    await supabase
      .from("animus_orders")
      .update({ status: "fulfilled" } as any)
      .eq("id", orderId)
      .eq("status", "paid");

    console.log(`[iCount Webhook] ✓ Order ${orderId} sent to ShineOn successfully`);

    const shipEmail = body.client_email || body.email;
    const shipName = body.client_name || body.first_name || "";
    const trackingUrl = shineonResult ? (() => { try { return JSON.parse(shineonResult)?.order?.tracking_url; } catch { return undefined; } })() : undefined;
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
    return json({ success: true, error: err?.message || "Unknown error" });
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : value == null ? "" : String(value).trim().toLowerCase();
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return null;
}

function isSuccessfulPayment(body: any, paymentStatus: string): boolean {
  return SUCCESS_STATUSES.has(paymentStatus) || body.is_paid === true || body.paid === true || body.success === true || body.approved === true;
}

function isFailedPayment(body: any, paymentStatus: string): boolean {
  return FAILURE_STATUSES.has(paymentStatus) || body.is_paid === false || body.paid === false || body.success === false;
}

function extractOrderId(body: any): string | null {
  const candidates = [body.comment, body.custom, body.cs1, body.order_id, body.orderId, body.info];
  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate.trim() : String(candidate || "").trim();
    if (UUID_RE.test(value)) return value;
  }
  return null;
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
