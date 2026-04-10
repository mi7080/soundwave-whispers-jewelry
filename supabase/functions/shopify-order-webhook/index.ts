import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[Webhook] Received Shopify order/paid event");

    const shopifyOrderId = body.id?.toString() || "";
    const orderNumber = body.order_number?.toString() || body.name || "";

    // Look for our custom line item properties to find the ANIMUS order UUID
    let animusOrderId = "";
    const lineItems = body.line_items || [];
    for (const item of lineItems) {
      const properties = item.properties || [];
      for (const prop of properties) {
        if (prop.name === "_Soul_Page_Link" && prop.value) {
          const match = prop.value.match(/\/soul\/([0-9a-f-]{36})/i);
          if (match) {
            animusOrderId = match[1];
            break;
          }
        }
      }
      if (animusOrderId) break;
    }

    if (!animusOrderId) {
      console.log("[Webhook] No ANIMUS order ID found in line items, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Webhook] Processing ANIMUS order: ${animusOrderId}, Shopify #${orderNumber}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase.from("animus_orders").update({
      shopify_order_id: `#${orderNumber}`,
      status: "paid",
    }).eq("id", animusOrderId);

    if (updateError) {
      console.error("[Webhook] DB update failed:", updateError);
    } else {
      console.log(`[Webhook] ✓ Order ${animusOrderId} updated to 'paid', Shopify #${orderNumber}`);
    }

    // --- Chain: invoke process-order-to-shineon for fulfillment ---
    try {
      const fnUrl = `${supabaseUrl}/functions/v1/process-order-to-shineon`;
      console.log(`[Webhook] Chaining to process-order-to-shineon for order ${animusOrderId}`);
      const chainResp = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          animusOrderId,
          shopifyOrderId: shopifyOrderId,
          shopifyOrderNumber: orderNumber,
          shippingAddress: body.shipping_address || null,
        }),
      });
      const chainResult = await chainResp.json();
      console.log(`[Webhook] ✓ ShineOn chain result:`, JSON.stringify(chainResult));
    } catch (chainErr) {
      console.error("[Webhook] ShineOn chain failed (non-blocking):", chainErr);
    }

    return new Response(JSON.stringify({ success: true, animusOrderId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    // Always return 200 to Shopify to prevent retries
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
