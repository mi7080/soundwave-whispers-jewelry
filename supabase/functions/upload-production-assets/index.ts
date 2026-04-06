import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const CLOUD_NAME = "dsmbuwxqf";

async function generateSignature(params: Record<string, string>, apiSecret: string): Promise<string> {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const data = new TextEncoder().encode(sorted + apiSecret);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function uploadToCloudinary(
  fileBytes: Uint8Array,
  folder: string,
  publicId: string,
  resourceType: string,
  apiKey: string,
  apiSecret: string
): Promise<string> {
  const b64 = base64Encode(fileBytes);
  const dataUri = `data:image/png;base64,${b64}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const params: Record<string, string> = {
    folder,
    public_id: publicId,
    timestamp,
  };
  const signature = await generateSignature(params, apiSecret);

  const form = new FormData();
  form.append("file", dataUri);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  const data = await res.json();
  return data.secure_url;
}

async function uploadTextToCloudinary(
  text: string,
  folder: string,
  publicId: string,
  apiKey: string,
  apiSecret: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const params: Record<string, string> = {
    folder,
    public_id: publicId,
    timestamp,
  };
  const signature = await generateSignature(params, apiSecret);

  const form = new FormData();
  form.append("file", new Blob([text], { type: "text/plain" }), `${publicId}.txt`);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary text upload failed: ${err}`);
  }

  const data = await res.json();
  return data.secure_url;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");
    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error("Cloudinary credentials not configured");
    }

    const { orderId, petName, svgContent, soulPageUrl, backText } = await req.json();
    if (!orderId || !svgContent) {
      return new Response(JSON.stringify({ error: "orderId and svgContent required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeName = (petName || "Order").replace(/[^a-zA-Z0-9]/g, "_");
    const shortId = orderId.slice(0, 8);
    const folder = `Orders/${safeName}_${shortId}`;

    // Upload front engraving SVG as PNG-ready file (SVG content as image)
    const svgBytes = new TextEncoder().encode(svgContent);
    const frontUrl = await uploadToCloudinary(
      svgBytes, folder, "Front_Engraving_HighRes", "image", CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
    );

    // Upload QR code as separate backup (generate simple QR SVG)
    // We'll upload the SVG itself since it contains the QR
    let qrUrl = "";
    try {
      qrUrl = await uploadToCloudinary(
        svgBytes, folder, "Soul_Page_QR", "image", CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
      );
    } catch (e) {
      console.error("QR upload failed (non-critical):", e);
    }

    // Upload back text reference if provided
    let backTextUrl = "";
    if (backText && backText.trim()) {
      try {
        backTextUrl = await uploadTextToCloudinary(
          backText.trim(), folder, "Back_Text_Reference", CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
        );
      } catch (e) {
        console.error("Back text upload failed (non-critical):", e);
      }
    }

    const folderUrl = `https://console.cloudinary.com/console/media_library/folders/${encodeURIComponent(folder)}?cloud_name=${CLOUD_NAME}`;

    // Update order in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("animus_orders").update({
      cloudinary_folder_url: folderUrl,
      design_image_url: frontUrl,
    }).eq("id", orderId);

    return new Response(JSON.stringify({
      success: true,
      folderUrl,
      frontUrl,
      qrUrl,
      backTextUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
