import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHINEON_API_URL = "https://api.shineon.com/v2/orders";
const SHINEON_PRODUCT_ID = "PROD-5115334";

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
      .select("id, design_image_url, pet_name")
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

    // Send order to ShineOn
    const shineonApiKey = Deno.env.get("SHINEON_API_KEY");
    if (!shineonApiKey) {
      console.error("[iCount Webhook] SHINEON_API_KEY not configured");
      return new Response(JSON.stringify({ success: true, shineon_skipped: true, reason: "missing_shineon_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract shipping info from the webhook or from the stored order
    const shippingAddress = {
      first_name: body.client_name?.split(" ")[0] || body.first_name || "",
      last_name: body.client_name?.split(" ").slice(1).join(" ") || body.last_name || "",
      address1: body.address || body.street || "",
      address2: "",
      city: body.city || "",
      province: body.state || "",
      province_code: "",
      country: body.country || "",
      country_code: body.country_code || "",
      zip: body.zip || "",
      phone: body.phone || "",
    };

    const notificationUrl = `${supabaseUrl}/functions/v1/icount-payment-webhook`;

    const shineonPayload = {
      order: {
        source_id: `icount-${orderId}`,
        shipment_notification_url: notificationUrl,
        shipping_address: shippingAddress,
        line_items: [
          {
            product_id: SHINEON_PRODUCT_ID,
            quantity: 1,
            personalizations: {
              front: order.design_image_url,
            },
            properties: {
              "Engraving Line 1": order.pet_name || "",
            },
          },
        ],
      },
    };

    console.log(`[iCount Webhook] Submitting to ShineOn — Design: ${order.design_image_url}, Name: ${order.pet_name}`);

    const shineonResponse = await fetch(SHINEON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${shineonApiKey}`,
      },
      body: JSON.stringify(shineonPayload),
    });

    const shineonResult = await shineonResponse.text();
    console.log(`[iCount Webhook] ShineOn response: ${shineonResponse.status} — ${shineonResult}`);

    if (!shineonResponse.ok) {
      console.error(`[iCount Webhook] ShineOn API error: ${shineonResponse.status}`);
      await supabase
        .from("animus_orders")
        .update({ status: "shineon_error" })
        .eq("id", orderId);

      return new Response(JSON.stringify({ success: true, shineon_error: true, status: shineonResponse.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order status to fulfilled
    await supabase
      .from("animus_orders")
      .update({ status: "fulfilled" })
      .eq("id", orderId);

    console.log(`[iCount Webhook] ✓ Order ${orderId} sent to ShineOn successfully`);

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
