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
  const mime = resourceType === "video" ? "audio/mpeg" : "image/svg+xml";
  const dataUri = `data:${mime};base64,${b64}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const params: Record<string, string> = { folder, public_id: publicId, timestamp };
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
  const params: Record<string, string> = { folder, public_id: publicId, timestamp };
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

async function uploadRemoteFileToCloudinary(
  remoteUrl: string,
  folder: string,
  publicId: string,
  resourceType: string,
  apiKey: string,
  apiSecret: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = { folder, public_id: publicId, timestamp };
  const signature = await generateSignature(params, apiSecret);

  const form = new FormData();
  form.append("file", remoteUrl);
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
    throw new Error(`Cloudinary remote upload failed: ${err}`);
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

    const { orderId, petName, svgContent, soulPageUrl, backText, audioUrl, photoUrl } = await req.json();
    if (!orderId || !svgContent) {
      return new Response(JSON.stringify({ error: "orderId and svgContent required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeName = (petName || "Order").replace(/[^a-zA-Z0-9]/g, "_");
    const shortId = orderId.slice(0, 8);
    const rootFolder = `ANIMUS_ORDERS/${shortId}_${safeName}`;
    const soulAssetsFolder = `${rootFolder}/SoulPage_Assets`;
    const productionFolder = `${rootFolder}/Production_Assets`;

    const results: Record<string, string> = {};

    // === Production_Assets: Upload front engraving SVG ===
    const svgBytes = new TextEncoder().encode(svgContent);
    results.frontEngravingUrl = await uploadToCloudinary(
      svgBytes, productionFolder, "final_engraving_design", "image",
      CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
    );

    // === SoulPage_Assets: Upload customer photo (remote URL) ===
    if (photoUrl) {
      try {
        results.customerPhotoUrl = await uploadRemoteFileToCloudinary(
          photoUrl, soulAssetsFolder, "customer_photo", "image",
          CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
        );
      } catch (e) {
        console.error("Photo upload failed (non-critical):", e);
      }
    }

    // === SoulPage_Assets: Upload customer audio (remote URL) ===
    if (audioUrl) {
      try {
        results.customerAudioUrl = await uploadRemoteFileToCloudinary(
          audioUrl, soulAssetsFolder, "customer_audio", "video",
          CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
        );
      } catch (e) {
        console.error("Audio upload failed (non-critical):", e);
      }
    }

    // === SoulPage_Assets: Upload metadata.json ===
    const metadata = JSON.stringify({
      petName: petName || "",
      soulPageUrl: soulPageUrl || "",
      backText: backText || "",
      orderId,
      createdAt: new Date().toISOString(),
    }, null, 2);

    try {
      results.metadataUrl = await uploadTextToCloudinary(
        metadata, soulAssetsFolder, "metadata", CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
      );
    } catch (e) {
      console.error("Metadata upload failed (non-critical):", e);
    }

    // === SoulPage_Assets: Upload back text reference ===
    if (backText && backText.trim()) {
      try {
        results.backTextUrl = await uploadTextToCloudinary(
          backText.trim(), soulAssetsFolder, "back_text_reference",
          CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
        );
      } catch (e) {
        console.error("Back text upload failed (non-critical):", e);
      }
    }

    const folderUrl = `https://console.cloudinary.com/console/media_library/folders/${encodeURIComponent(rootFolder)}?cloud_name=${CLOUD_NAME}`;

    // === Verification: Check critical assets exist ===
    const verified = !!results.frontEngravingUrl;

    // Update order in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const updatePayload: Record<string, string | null> = {
      cloudinary_folder_url: folderUrl,
      design_image_url: results.frontEngravingUrl || null,
    };
    // Update photo/audio URLs to point to the organized sub-folder copies
    if (results.customerPhotoUrl) {
      updatePayload.pet_photo_url = results.customerPhotoUrl;
    }
    if (results.customerAudioUrl) {
      updatePayload.audio_url = results.customerAudioUrl;
    }
    const { data: updatedOrder, error: updateError } = await supabase
      .from("animus_orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select("id, pet_photo_url, audio_url, soul_page_url, cloudinary_folder_url, design_image_url")
      .maybeSingle();

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    if (!updatedOrder) {
      throw new Error("Order verification failed after asset upload");
    }

    return new Response(JSON.stringify({
      success: true,
      verified,
      folderUrl,
      frontUrl: results.frontEngravingUrl || "",
      customerPhotoUrl: results.customerPhotoUrl || "",
      customerAudioUrl: results.customerAudioUrl || "",
      metadataUrl: results.metadataUrl || "",
      backTextUrl: results.backTextUrl || "",
      persistedOrder: updatedOrder,
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
