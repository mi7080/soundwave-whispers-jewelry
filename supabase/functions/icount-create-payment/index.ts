import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ICOUNT_API_BASE = "https://api.icount.co.il/api/v3.php";

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
    const {
      orderId, fullName, email, phone, address, city, state, zip, country,
      amount, currency, siteUrl, successUrl, failureUrl,
    } = body;

    if (!orderId || !email || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: orderId, email, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the order exists
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

    const webhookUrl = `${supabaseUrl}/functions/v1/icount-payment-webhook`;
    const encodedName = encodeURIComponent(fullName || "");
    const finalSuccess = successUrl || `${siteUrl || ""}/thank-you?order=${orderId}&amount=${amount}&name=${encodedName}`;
    const finalFailure = failureUrl || `${siteUrl || ""}/checkout?order=${orderId}&status=failed`;

    // iCount payment-page payload — shipping pre-filled, customer only sees CC entry
    const paymentPayload: Record<string, any> = {
      sid: icountToken, // iCount uses sid for v3.php
      cid: "credit",
      doctype: "invrec",
      currency_code: currency || "USD",
      lang: "en",
      sum: Number(amount),
      description: `ANIMUS Memorial Pendant — ${order.pet_name || "Custom"}`,
      // Customer details (pre-filled)
      client_name: fullName || "",
      email: email,
      mobile: phone || "",
      cc_address: address || "",
      cc_city: city || "",
      cc_zip: zip || "",
      cc_country: country || "",
      cc_state: state || "",
      // Hide shipping fields on iCount page (already collected)
      hide_address: 1,
      hide_email: 1,
      hide_name: 1,
      // Reference / callbacks
      custom: orderId,
      info: orderId,
      cs1: orderId,
      cs2: fullName || "",
      cs3: amount,
      success_url: finalSuccess,
      fail_url: finalFailure,
      ipn_url: webhookUrl,
    };

    console.log("[iCount] Creating payment for order:", orderId);

    const icountResp = await fetch(`${ICOUNT_API_BASE}/cc_page/sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload),
    });

    const icountText = await icountResp.text();
    let icountResult: any;
    try { icountResult = JSON.parse(icountText); } catch { icountResult = { raw: icountText }; }
    console.log("[iCount] API response:", JSON.stringify(icountResult));

    const paymentUrl =
      icountResult?.url ||
      icountResult?.payment_url ||
      icountResult?.redirect_url ||
      icountResult?.cc_page_url ||
      icountResult?.data?.url;

    if (!icountResp.ok || icountResult?.status === false || !paymentUrl) {
      console.error("[iCount] Payment creation failed — falling back to legacy URL");

      // Fallback: legacy static iCount payment URL with order params
      const FALLBACK_BASE = "https://app.icount.co.il/m/f9f6f/c693586ep3u69dfd9dd?utm_source=iCount&utm_medium=paypage&utm_campaign=3";
      const params = new URLSearchParams({
        info: orderId,
        cs1: String(amount),
        cs2: fullName || "",
        cs3: email,
      });
      const fallbackUrl = `${FALLBACK_BASE}&${params.toString()}`;

      await supabase
        .from("animus_orders")
        .update({ status: "payment_pending" })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({
          success: true,
          paymentUrl: fallbackUrl,
          orderId,
          fallback: true,
          icountError: icountResult?.reason || icountResult?.error_description || "Static link used",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("animus_orders")
      .update({ status: "payment_pending" })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({ success: true, paymentUrl, orderId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[iCount] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
