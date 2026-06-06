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
    // The iCount payment page (עמוד סליקה) the sale is generated against. Defaults
    // to page 3 (the existing ANIMUS page seen as cc_page_id in webhooks); override
    // via env without a code change.
    const paypageId = Number(Deno.env.get("ICOUNT_PAYPAGE_ID") || "3");

    const body = await req.json();
    const {
      orderId, fullName, email, phone, address, city, state, zip, country,
      amount, currency, siteUrl, successUrl, failureUrl,
      discountCode, discountPercent,
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

    // IPN carries the shared secret as a query param so iCount echoes it back on the
    // server-to-server call (the webhook accepts the secret from header OR query).
    const webhookSecret = Deno.env.get("ICOUNT_WEBHOOK_SECRET");
    const webhookUrl = webhookSecret
      ? `${supabaseUrl}/functions/v1/icount-payment-webhook?secret=${encodeURIComponent(webhookSecret)}`
      : `${supabaseUrl}/functions/v1/icount-payment-webhook`;
    if (!webhookSecret) {
      console.warn("[iCount] ICOUNT_WEBHOOK_SECRET not set - ipn_url has no secret; webhook may reject the IPN");
    }

    const encodedName = encodeURIComponent(fullName || "");
    const finalSuccess = successUrl || `${siteUrl || ""}/thank-you?order=${orderId}&amount=${amount}&name=${encodedName}`;
    const finalFailure = failureUrl || `${siteUrl || ""}/checkout?order=${orderId}&status=failed`;

    // paypage/generate_sale - the documented endpoint. Auth is a Bearer API token
    // in the Authorization header (NOT `sid` in the body).
    //
    // We intentionally do NOT prefill customer/shipping details: iCount's prefill is
    // unreliable (the fields can't be edited on their page) and we already hold the
    // customer + shipping data on the order from our own checkout. The buyer enters
    // their details on the iCount page; fulfillment uses the order's stored data.
    //
    // The order is linked back via utm_content/utm_term (the IPN does NOT echo
    // sale_uniqid, but it DOES echo the utm_* fields). The webhook's extractOrderId
    // scans all fields for that UUID.
    const salePayload: Record<string, any> = {
      paypage_id: paypageId,
      currency_code: currency || "USD",
      sum: Number(amount),
      description: `ANIMUS Personalized Pendant - ${order.pet_name || "Custom"}`,
      success_url: finalSuccess,
      failure_url: finalFailure,
      ipn_url: webhookUrl,
      utm_content: orderId,
      utm_term: orderId,
    };

    console.log("[iCount] generate_sale payload:", JSON.stringify({
      orderId,
      paypage_id: paypageId,
      sum: salePayload.sum,
      discountCode: discountCode ? String(discountCode).toUpperCase() : null,
      discountPercent: discountPercent || 0,
    }));

    const icountResp = await fetch(`${ICOUNT_API_BASE}/paypage/generate_sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${icountToken}`,
      },
      body: JSON.stringify(salePayload),
    });

    const icountText = await icountResp.text();
    let icountResult: any;
    try { icountResult = JSON.parse(icountText); } catch { icountResult = { raw: icountText }; }
    console.log("[iCount] generate_sale response:", JSON.stringify(icountResult));

    const paymentUrl = icountResult?.sale_url;
    const saleUniqid = icountResult?.sale_uniqid || null;

    if (!icountResp.ok || icountResult?.status === false || !paymentUrl) {
      console.error("[iCount] generate_sale failed - falling back to legacy static URL", icountResult?.reason || icountResult?.error_description || "");

      // Fallback: legacy static iCount payment URL. NOTE: this page carries no
      // order reference, so the webhook will have to fall back to email matching - 
      // which is exactly the case we want to avoid. The fallback exists only so a
      // checkout never hard-fails; a fallback here should be treated as an alert.
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
          icountError: icountResult?.reason || icountResult?.error_description || icountResult?.raw || "generate_sale returned no sale_url",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the sale id so the webhook can match this exact payment to this order.
    await supabase
      .from("animus_orders")
      .update({ status: "payment_pending", icount_sale_uniqid: saleUniqid } as any)
      .eq("id", orderId);

    console.log(`[iCount] ✓ Sale created for order ${orderId} - sale_uniqid: ${saleUniqid}`);

    // Mark discount code as used (best-effort reservation; webhook can re-affirm).
    if (discountCode) {
      try {
        await supabase
          .from("discount_codes")
          .update({ used_at: new Date().toISOString(), used_by_order: orderId })
          .eq("code", String(discountCode).toUpperCase())
          .is("used_at", null);
        console.log("[iCount] Reserved discount code:", discountCode, "pct:", discountPercent);
      } catch (e) {
        console.warn("[iCount] Could not reserve discount code:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, paymentUrl, orderId, saleUniqid }),
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
