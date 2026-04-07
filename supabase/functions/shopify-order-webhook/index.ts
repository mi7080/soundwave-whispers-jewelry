import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const CLOUD_NAME = "dsmbuwxqf";

async function generateSignature(params: Record<string, string>, apiSecret: string): Promise<string> {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const data = new TextEncoder().encode(sorted + apiSecret);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function renameCloudinaryFolder(
  oldFolder: string,
  newFolder: string,
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    from_folder: oldFolder,
    to_folder: newFolder,
    timestamp,
  };
  const signature = await generateSignature(params, apiSecret);

  const form = new URLSearchParams();
  form.append("from_folder", oldFolder);
  form.append("to_folder", newFolder);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/folders/${encodeURIComponent(oldFolder)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Cloudinary folder rename failed:", err);
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[Webhook] Received Shopify order/paid event");

    // Extract relevant data from Shopify webhook
    const shopifyOrderId = body.id?.toString() || "";
    const orderNumber = body.order_number?.toString() || body.name || "";
    const customerName = [
      body.customer?.first_name || "",
      body.customer?.last_name || "",
    ].filter(Boolean).join("_").replace(/[^a-zA-Z0-9_]/g, "") || "Customer";

    // Look for our custom line item properties to find the ANIMUS order UUID
    let animusOrderId = "";
    const lineItems = body.line_items || [];
    for (const item of lineItems) {
      const properties = item.properties || [];
      for (const prop of properties) {
        if (prop.name === "_Soul_Page_Link" && prop.value) {
          // Extract UUID from soul page URL: https://animuswave.com/soul/[UUID]
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

    // Update database with Shopify order info
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase.from("animus_orders").update({
      shopify_order_id: `#${orderNumber}`,
      status: "paid",
    }).eq("id", animusOrderId);

    if (updateError) {
      console.error("[Webhook] DB update failed:", updateError);
    }

    // Rename Cloudinary folder from UUID to Order#_CustomerName
    const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

    if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      const shortId = animusOrderId.slice(0, 8);
      const { data: order } = await supabase
        .from("animus_orders")
        .select("pet_name")
        .eq("id", animusOrderId)
        .maybeSingle();

      const safePetName = (order?.pet_name || "Order").replace(/[^a-zA-Z0-9]/g, "_");
      const oldFolder = `ANIMUS_ORDERS/${shortId}_${safePetName}`;
      const newFolder = `ANIMUS_ORDERS/Order_${orderNumber}_${customerName}`;

      const renamed = await renameCloudinaryFolder(
        oldFolder, newFolder, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
      );

      if (renamed) {
        const newFolderUrl = `https://console.cloudinary.com/console/media_library/folders/${encodeURIComponent(newFolder)}?cloud_name=${CLOUD_NAME}`;
        await supabase.from("animus_orders").update({
          cloudinary_folder_url: newFolderUrl,
        }).eq("id", animusOrderId);
        console.log(`[Webhook] Folder renamed: ${oldFolder} → ${newFolder}`);
      }
    }

    return new Response(JSON.stringify({ success: true, animusOrderId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
