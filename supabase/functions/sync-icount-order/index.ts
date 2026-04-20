import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ICOUNT_API_BASE = "https://api.icount.co.il/api/v3.php";

interface SyncRequest {
  orderId: string;
  docnum?: string; // optional override
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderId, docnum: docnumOverride } = (await req.json()) as SyncRequest;
    if (!orderId) {
      return json({ success: false, error: "orderId is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: orderErr } = await supabase
      .from("animus_orders")
      .select("id, icount_docnum, customer_email")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return json({ success: false, error: "Order not found" }, 404);
    }

    const docnum = docnumOverride || order.icount_docnum;
    if (!docnum) {
      return json(
        { success: false, error: "No iCount docnum on this order. Cannot sync — order may not have completed payment." },
        400
      );
    }

    const apiToken = Deno.env.get("ICOUNT_API_TOKEN");
    if (!apiToken) {
      return json({ success: false, error: "ICOUNT_API_TOKEN not configured" }, 500);
    }

    // Fetch the document from iCount
    // iCount's doc/info endpoint returns the full invoice/receipt incl. customer + items
    const icountUrl = `${ICOUNT_API_BASE}/doc/info`;
    const icountRes = await fetch(icountUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid: apiToken, docnum: String(docnum) }),
    });

    const icountText = await icountRes.text();
    let icountData: any;
    try {
      icountData = JSON.parse(icountText);
    } catch {
      console.error("[sync-icount] Non-JSON response:", icountText.slice(0, 500));
      return json({ success: false, error: "Invalid response from iCount" }, 502);
    }

    if (!icountRes.ok || icountData?.status === false) {
      console.error("[sync-icount] iCount error:", icountData);
      // Return 200 + fallback so bulk loops don't break on a single bad order
      return json({
        success: false,
        fallback: true,
        error: icountData?.reason || `iCount API error ${icountRes.status}`,
      });
    }

    // iCount typically returns { status: true, doc_info: {...} } or the doc fields at top-level
    const doc = icountData.doc_info || icountData.doc || icountData;
    const client = doc.client || doc.customer || doc;

    const customerEmail = client.email || client.client_email || doc.email || null;
    const firstName = client.first_name || "";
    const lastName = client.last_name || "";
    const customerName =
      client.client_name || client.name || [firstName, lastName].filter(Boolean).join(" ").trim() || null;

    const shippingAddress1 = client.address || client.street || doc.address || null;
    const shippingCity = client.city || doc.city || null;
    const shippingZip = client.zip || client.postal_code || doc.zip || null;
    const shippingCountryCode =
      client.country_code || client.country || doc.country_code || doc.country || null;

    const amountRaw = doc.total || doc.amount || doc.total_with_vat || null;
    const amount = amountRaw != null && amountRaw !== "" && !Number.isNaN(Number(amountRaw)) ? Number(amountRaw) : null;

    const updates: Record<string, unknown> = {
      icount_docnum: String(docnum),
    };
    if (customerEmail) updates.customer_email = customerEmail;
    if (customerName) updates.customer_name = customerName;
    if (shippingAddress1) updates.shipping_address1 = shippingAddress1;
    if (shippingCity) updates.shipping_city = shippingCity;
    if (shippingZip) updates.shipping_zip = shippingZip;
    if (shippingCountryCode) updates.shipping_country_code = shippingCountryCode;
    if (amount !== null) updates.amount = amount;

    const { error: updateErr } = await supabase
      .from("animus_orders")
      .update(updates)
      .eq("id", orderId);

    if (updateErr) {
      console.error("[sync-icount] DB update failed:", updateErr);
      return json({ success: false, error: "Failed to save synced data" }, 500);
    }

    const synced = Object.keys(updates).filter((k) => k !== "icount_docnum");
    return json({
      success: true,
      docnum: String(docnum),
      synced_fields: synced,
      updates,
    });
  } catch (err: any) {
    console.error("[sync-icount] Unexpected error:", err);
    return json({ success: false, error: err?.message || "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
