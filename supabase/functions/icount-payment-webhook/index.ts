import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHINEON_API_URL = "https://api.shineon.com/v1/orders";
const SHINEON_SKU = "SO-15845645";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify iCount webhook secret
    const webhookSecret = Deno.env.get("ICOUNT_WEBHOOK_SECRET");
    const receivedSecret = req.headers.get("X-iCount-Secret") || req.headers.get("x-icount-secret");

    if (webhookSecret && receivedSecret !== webhookSecret) {
      console.error("[iCount Webhook] Invalid secret header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("[iCount Webhook] Received payload:", JSON.stringify(body));

    // Extract order ID from the custom field
    const orderId = body.custom || body.order_id || body.orderId;
    const paymentStatus = body.status || body.payment_status;

    if (!orderId) {
      console.error("[iCount Webhook] No order ID found in payload");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_order_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[iCount Webhook] Order: ${orderId}, Status: ${paymentStatus}`);

    // Only process successful payments
    const isSuccess = paymentStatus === "success" || paymentStatus === "approved" || body.is_paid === true || body.paid === true;

    if (!isSuccess) {
      console.log("[iCount Webhook] Payment not successful, updating status");
      await supabase
        .from("animus_orders")
        .update({ status: "payment_failed" })
        .eq("id", orderId);

      return new Response(JSON.stringify({ success: true, payment_status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order status to paid
    await supabase
      .from("animus_orders")
      .update({ status: "paid" })
      .eq("id", orderId);

    console.log(`[iCount Webhook] ✓ Order ${orderId} marked as paid`);

    // Send order confirmation email
    const customerEmail = body.client_email || body.email;
    const customerName = body.client_name || body.first_name || "";
    const paymentAmount = body.amount || body.total || "";
    if (customerEmail) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "order-confirmation",
            recipientEmail: customerEmail,
            idempotencyKey: `order-confirm-${orderId}`,
            templateData: {
              name: customerName,
              orderId,
              amount: String(paymentAmount),
              petName: order?.pet_name || "",
            },
          },
        });
        console.log(`[iCount Webhook] ✓ Confirmation email queued for ${customerEmail}`);
      } catch (emailErr) {
        console.error("[iCount Webhook] Email send failed (non-blocking):", emailErr);
      }
    }


    // Retrieve order details for ShineOn fulfillment
    const { data: order, error: dbError } = await supabase
      .from("animus_orders")
      .select("id, design_image_url, pet_name, soul_page_url, customer_email, customer_name")
      .eq("id", orderId)
      .maybeSingle();

    if (dbError || !order) {
      console.error("[iCount Webhook] Order not found for ShineOn:", orderId);
      return new Response(JSON.stringify({ success: true, shineon_skipped: true, reason: "order_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.design_image_url) {
      console.error("[iCount Webhook] No design_image_url for order:", orderId);
      return new Response(JSON.stringify({ success: true, shineon_skipped: true, reason: "no_design_url" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send order to ShineOn (Direct API v1)
    const shineonApiKey = Deno.env.get("SHINEON_API_KEY");
    if (!shineonApiKey) {
      console.error("[iCount Webhook] SHINEON_API_KEY not configured");
      return new Response(JSON.stringify({ success: true, shineon_skipped: true, reason: "missing_shineon_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // iCount docnum → ShineOn order_number
    const docnum = body.docnum || body.doc_number || body.invoice_number || `icount-${orderId}`;

    // Map iCount customer fields → ShineOn shipping_address
    const fullName = body.client_name || order.customer_name || "";
    const customerEmailForShipping = body.client_email || body.email || order.customer_email || "";
    const shippingAddress = {
      first_name: fullName.split(" ")[0] || body.first_name || "",
      last_name: fullName.split(" ").slice(1).join(" ") || body.last_name || "",
      address1: body.address || body.street || "",
      address2: body.address2 || "",
      city: body.city || "",
      province: body.state || body.province || "",
      province_code: body.province_code || "",
      country: body.country || "",
      country_code: body.country_code || "",
      zip: body.zip || body.postal_code || "",
      phone: body.phone || "",
      email: customerEmailForShipping,
    };

    // engraving_text = soul page URL (the generated image/recording page)
    const engravingText = order.soul_page_url || order.design_image_url;

    const shineonPayload = {
      order_number: String(docnum),
      shipping_address: shippingAddress,
      line_items: [
        {
          sku: SHINEON_SKU,
          quantity: 1,
          line_item_print_url: order.design_image_url,
        },
      ],
    };

    console.log(`[iCount Webhook] Submitting to ShineOn v1 — order_number: ${docnum}, sku: ${SHINEON_SKU}, print_url: ${order.design_image_url}`);

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
      // Persist full error response body for debugging
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
        });

      await supabase
        .from("animus_orders")
        .update({ status: "shineon_error" })
        .eq("id", orderId);

      return new Response(JSON.stringify({ success: true, shineon_error: true, status: shineonResponse.status, body: shineonResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order status to fulfilled
    await supabase
      .from("animus_orders")
      .update({ status: "fulfilled" })
      .eq("id", orderId);

    console.log(`[iCount Webhook] ✓ Order ${orderId} sent to ShineOn successfully`);

    // Send shipping notification email
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
              petName: order?.pet_name || "",
              trackingUrl: trackingUrl || "",
            },
          },
        });
        console.log(`[iCount Webhook] ✓ Shipping email queued for ${shipEmail}`);
      } catch (emailErr) {
        console.error("[iCount Webhook] Shipping email failed (non-blocking):", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, shineon_submitted: true, orderId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[iCount Webhook] Unexpected error:", err);
    return new Response(JSON.stringify({ success: true, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
