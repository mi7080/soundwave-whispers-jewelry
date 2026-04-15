import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ICOUNT_API_BASE = "https://api.icount.co.il/api/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const icountToken = Deno.env.get("ICOUNT_API_TOKEN");
    if (!icountToken) {
      return new Response(
        JSON.stringify({ error: "iCount API token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { orderId, fullName, email, address, city, state, zip, country, amount, currency } = body;

    if (!orderId || !email || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: orderId, email, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the order exists in our database
    const { data: order, error: dbError } = await supabase
      .from("animus_orders")
      .select("id, pet_name, design_image_url")
      .eq("id", orderId)
      .maybeSingle();

    if (dbError || !order) {
      console.error("[iCount] Order not found:", orderId);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the callback URL for iCount webhooks
    const webhookUrl = `${supabaseUrl}/functions/v1/icount-payment-webhook`;
    const encodedName = encodeURIComponent(fullName || "");
    const successUrl = body.successUrl || `${body.siteUrl || ""}/thank-you?order=${orderId}&amount=${amount}&name=${encodedName}`;
    const failureUrl = body.failureUrl || `${body.siteUrl || ""}/checkout?order=${orderId}&status=failed`;

    // Create payment via iCount API
    // iCount cc_page/sale endpoint to create a payment URL
    const paymentPayload = {
      api_token: icountToken,
      doc_type: "invrec", // Invoice Receipt
      client_name: fullName || "",
      client_email: email,
      items: [
        {
          description: `ANIMUS Memorial Pendant — ${order.pet_name || "Custom"}`,
          unitprice: amount,
          quantity: 1,
        },
      ],
      currency_code: currency || "USD",
      success_url: successUrl,
      failure_url: failureUrl,
      ipn_url: webhookUrl,
      custom: orderId, // Pass order ID for webhook identification
    };

    console.log("[iCount] Creating payment for order:", orderId);

    const icountResp = await fetch(`${ICOUNT_API_BASE}/cc_page/sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload),
    });

    const icountResult = await icountResp.json();
    console.log("[iCount] API response:", JSON.stringify(icountResult));

    if (!icountResp.ok || icountResult.status === false) {
      console.error("[iCount] Payment creation failed:", icountResult);
      return new Response(
        JSON.stringify({ error: "Payment creation failed", details: icountResult.reason || icountResult.error_description || "Unknown error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // iCount returns a payment URL that the user can be redirected to
    const paymentUrl = icountResult.url || icountResult.payment_url || icountResult.redirect_url;

    if (!paymentUrl) {
      console.error("[iCount] No payment URL in response:", icountResult);
      return new Response(
        JSON.stringify({ error: "No payment URL returned from iCount" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order status
    await supabase
      .from("animus_orders")
      .update({ status: "payment_pending" })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({ success: true, paymentUrl, orderId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[iCount] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
