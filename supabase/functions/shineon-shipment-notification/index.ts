import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { template as trackingTemplate } from "../_shared/transactional-email-templates/tracking-update.tsx";
import {
  unwrapShineonBody,
  extractShineonOrderId,
  extractShineonSourceId,
  sourceIdToOrderId,
  extractTracking,
  aggregatorTrackingUrl,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ShineOn POSTs here once an order ships (the shipment_notification_url set when
// the order was submitted). It captures tracking onto the order and emails the
// customer. Returns 200 even on soft failures so ShineOn doesn't retry-storm.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const rawBody = await req.text();
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      try {
        const params = new URLSearchParams(rawBody);
        for (const [k, v] of params.entries()) parsed[k] = v;
      } catch { /* ignore */ }
    }
    const body = unwrapShineonBody(parsed);

    // Shared-secret gate. This function is verify_jwt=false (ShineOn can't send a
    // Supabase JWT), so without this anyone who knows an order UUID could forge a
    // "shipped" callback and trigger a tracking email. The webhook sets
    // shipment_notification_url with `?secret=<SHINEON_WEBHOOK_SECRET>`; we accept the
    // secret from the query string or the body. Enforced only when the secret is
    // configured, so deploying this ahead of setting the env does not break callbacks.
    const expectedSecret = Deno.env.get("SHINEON_WEBHOOK_SECRET");
    if (expectedSecret) {
      const url = new URL(req.url);
      const receivedSecret = url.searchParams.get("secret")
        || parsed?.secret || (body as any)?.secret || null;
      if (receivedSecret !== expectedSecret) {
        console.warn("[ShineOn Shipment] Rejected callback: missing/invalid secret");
        return json({ success: false, error: "unauthorized" }, 401);
      }
    }
    console.log("[ShineOn Shipment] Received payload:", JSON.stringify(parsed));

    const shineonOrderId = extractShineonOrderId(body);
    const sourceId = extractShineonSourceId(body);
    const tracking = extractTracking(body);
    // ShineOn sends a number + carrier but no URL - give the customer a carrier-agnostic
    // aggregator link built from the number (falls back to any URL ShineOn ever does send).
    const trackingLink = tracking.url || aggregatorTrackingUrl(tracking.number);
    console.log(`[ShineOn Shipment] shineon_id: ${shineonOrderId || "none"}, source_id: ${sourceId || "none"}, tracking: ${tracking.number || "none"} (${tracking.carrier || "?"})`);

    if (!shineonOrderId && !sourceId) {
      return json({ success: true, skipped: true, reason: "no_match_key" });
    }

    // Resolve the order. Prefer ShineOn's own order id (captured at submit time) - 
    // it's always present in their callback and immune to source_id aliasing. Fall
    // back to our source_id: `icount-<uuid>` → by id; a plain docnum → by icount_docnum.
    const SELECT_COLS = "id, status, tracking_number, pet_name, customer_email, customer_name";
    let order: any = null;
    if (shineonOrderId) {
      const { data } = await supabase
        .from("animus_orders")
        .select(SELECT_COLS)
        .eq("shineon_order_id", shineonOrderId)
        .maybeSingle();
      order = data || null;
    }
    if (!order && sourceId) {
      const orderUuid = sourceIdToOrderId(sourceId);
      let query = supabase.from("animus_orders").select(SELECT_COLS);
      query = orderUuid ? query.eq("id", orderUuid) : query.eq("icount_docnum", sourceId);
      const { data } = await query.maybeSingle();
      order = data || null;
    }

    if (!order) {
      console.error(`[ShineOn Shipment] No order for shineon_id ${shineonOrderId || "?"} / source_id ${sourceId || "?"}`);
      return json({ success: true, skipped: true, reason: "no_matching_order", shineonOrderId, sourceId });
    }

    // Idempotent: ShineOn fires on every fulfilment-status change and may resend
    // the shipped callback. Close it out - no re-update, no second email - when this
    // is a duplicate: the order is already shipped, OR it already carries this exact
    // tracking number. A genuinely NEW tracking number on an already-shipped order
    // still passes through (corrected / split shipment) and notifies once more.
    const sameTracking = tracking.number && order.tracking_number === tracking.number;
    const alreadyShipped = order.status === "shipped" && !tracking.number;
    if (sameTracking || alreadyShipped) {
      console.log(`[ShineOn Shipment] Order ${order.id} already shipped (status: ${order.status}, tracking: ${order.tracking_number || "none"}); ignoring duplicate callback`);
      return json({ success: true, skipped: true, reason: "already_shipped", orderId: order.id });
    }

    const update: Record<string, unknown> = {
      status: "shipped",
      workflow_status: "shipped",
      tracking_updated_at: new Date().toISOString(),
    };
    if (tracking.number) update.tracking_number = tracking.number;
    if (trackingLink) update.tracking_url = trackingLink;
    if (tracking.carrier) update.tracking_carrier = tracking.carrier;

    const { error: updErr } = await supabase
      .from("animus_orders")
      .update(update as any)
      .eq("id", order.id);
    if (updErr) {
      console.error("[ShineOn Shipment] Failed to update order:", updErr);
      return json({ success: false, error: "Failed to update order" }, 500);
    }
    console.log(`[ShineOn Shipment] ✓ Order ${order.id} marked shipped (tracking: ${tracking.number || "none"})`);

    // Send the tracking email DIRECTLY via Resend. We bypass the
    // send-transactional-email → PGMQ → process-email-queue chain because the
    // function-to-function invoke is rejected by verify_jwt (this project's key is
    // not a legacy JWT). Direct send = no gateway, no queue, no cron; Resend confirms
    // delivery synchronously. Idempotency-Key dedupes any retried/duplicate send.
    let emailDebug: any = order.customer_email ? null : { skipped: "no_customer_email" };
    if (order.customer_email) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const resendFrom = Deno.env.get("RESEND_FROM") || "ANIMUS <onboarding@resend.dev>";
        if (!resendKey) {
          emailDebug = { failed: true, detail: "RESEND_API_KEY not set" };
        } else {
          // Render the shared brand template (same one the queue uses for
          // order-confirmation styling) so the email matches the brand.
          const props = {
            name: order.customer_name || "",
            petName: order.pet_name || "",
            trackingNumber: tracking.number || "",
            trackingUrl: trackingLink || "",
            carrier: tracking.carrier || "",
          };
          const el = React.createElement(trackingTemplate.component, props);
          const html = await renderAsync(el);
          const text = await renderAsync(el, { plainText: true });
          const subject = typeof trackingTemplate.subject === "function"
            ? trackingTemplate.subject(props)
            : trackingTemplate.subject;
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
              "Idempotency-Key": `tracking-${order.id}-${tracking.number || "x"}`,
            },
            body: JSON.stringify({
              from: resendFrom,
              to: order.customer_email,
              subject,
              html,
              text,
            }),
          });
          const respText = await resp.text();
          if (resp.ok) {
            let id: string | null = null;
            try { id = JSON.parse(respText)?.id ?? null; } catch { /* ignore */ }
            emailDebug = { sent: true, id };
            console.log(`[ShineOn Shipment] ✓ Tracking email sent via Resend to ${order.customer_email} (id: ${id || "?"})`);
          } else {
            emailDebug = { failed: true, resendStatus: resp.status, detail: respText.slice(0, 400) };
            console.error(`[ShineOn Shipment] Resend send failed ${resp.status}: ${respText.slice(0, 300)}`);
          }
        }
      } catch (emailErr: any) {
        emailDebug = { threw: true, detail: emailErr?.message || String(emailErr) };
        console.error("[ShineOn Shipment] Tracking email threw (non-blocking):", emailErr);
      }
    }

    return json({ success: true, shipped: true, orderId: order.id, tracking: tracking.number || null, email: emailDebug });
  } catch (err: any) {
    console.error("[ShineOn Shipment] Unexpected error:", err);
    // 200 so ShineOn doesn't retry-storm; failure is logged above.
    return json({ success: true, error: err?.message || "Unknown error" });
  }
});
