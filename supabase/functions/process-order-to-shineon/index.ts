import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHINEON_API_URL = "https://api.shineon.com/v2/orders";
const SHINEON_PRODUCT_ID = 30338;
const SHINEON_TEMPLATE = "PT-2151";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const shineonApiKey = Deno.env.get("SHINEON_API_KEY");
    if (!shineonApiKey) {
      console.error("[ShineOn] SHINEON_API_KEY is not configured");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "missing_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("[ShineOn] Received webhook payload");

    // Extract ANIMUS order UUID from line item properties
    let designUuid = "";
    const lineItems = body.line_items || [];
    for (const item of lineItems) {
      const properties = item.properties || [];
      for (const prop of properties) {
        if (prop.name === "_Soul_Page_Link" && prop.value) {
          const match = prop.value.match(/\/soul\/([0-9a-f-]{36})/i);
          if (match) {
            designUuid = match[1];
            break;
          }
        }
      }
      if (designUuid) break;
    }

    if (!designUuid) {
      console.log("[ShineOn] No ANIMUS design UUID found in line items, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_design_uuid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ShineOn] Design UUID: ${designUuid}`);

    // Retrieve production render URL and pet_name from animus_orders
    const { data: order, error: dbError } = await supabase
      .from("animus_orders")
      .select("id, design_image_url, pet_name")
      .eq("id", designUuid)
      .maybeSingle();

    if (dbError) {
      console.error("[ShineOn] Database query failed:", dbError.message);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "db_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order || !order.design_image_url) {
      console.error(`[ShineOn] No order or design_image_url found for UUID: ${designUuid}`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_design_url" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract shipping address from Shopify payload
    const addr = body.shipping_address || {};
    const shippingAddress = {
      first_name: addr.first_name || "",
      last_name: addr.last_name || "",
      address1: addr.address1 || "",
      address2: addr.address2 || "",
      city: addr.city || "",
      province: addr.province || "",
      province_code: addr.province_code || "",
      country: addr.country || "",
      country_code: addr.country_code || "",
      zip: addr.zip || "",
      phone: addr.phone || "",
    };

    const shopifyOrderId = body.id?.toString() || "";
    const orderNumber = body.order_number?.toString() || body.name || "";

    // Notification URL for shipment tracking callbacks
    const notificationUrl = `${supabaseUrl}/functions/v1/shopify-order-webhook`;

    // Construct ShineOn V2 order payload (wrapped in "order" object)
    const shineonPayload = {
      order: {
        source_id: `shopify-${shopifyOrderId}`,
        shipment_notification_url: notificationUrl,
        shipping_address: shippingAddress,
        line_items: [
          {
            product_id: SHINEON_PRODUCT_ID,
            template: SHINEON_TEMPLATE,
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

    console.log(`[ShineOn] Submitting order for Shopify #${orderNumber}, design: ${order.design_image_url}, name: ${order.pet_name}`);

    const shineonResponse = await fetch(SHINEON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${shineonApiKey}`,
      },
      body: JSON.stringify(shineonPayload),
    });

    const shineonResult = await shineonResponse.text();
    console.log(`[ShineOn] Response status: ${shineonResponse.status}, body: ${shineonResult}`);

    if (!shineonResponse.ok) {
      console.error(`[ShineOn] API error: ${shineonResponse.status} - ${shineonResult}`);
      return new Response(JSON.stringify({ success: true, shineon_error: true, status: shineonResponse.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ShineOn] ✓ Order submitted successfully for ANIMUS ${designUuid}`);

    return new Response(JSON.stringify({ success: true, shineon_submitted: true, designUuid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ShineOn] Unexpected error:", err);
    return new Response(JSON.stringify({ success: true, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
