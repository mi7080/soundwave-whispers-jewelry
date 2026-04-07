import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId, petName, svgContent, soulPageUrl, backText, audioUrl, photoUrl } = await req.json();
    if (!orderId || !svgContent) {
      return new Response(JSON.stringify({ error: "orderId and svgContent required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, string> = {};

    // Upload SVG to production_assets bucket
    const svgBytes = new TextEncoder().encode(svgContent);
    const svgPath = `${orderId}/final_engraving_design.svg`;
    const { error: svgErr } = await supabase.storage
      .from("production_assets")
      .upload(svgPath, svgBytes, { contentType: "image/svg+xml", upsert: true });

    if (svgErr) {
      throw new Error(`SVG upload failed: ${svgErr.message}`);
    }

    const { data: svgUrlData } = supabase.storage
      .from("production_assets")
      .getPublicUrl(svgPath);
    results.frontEngravingUrl = svgUrlData?.publicUrl || "";

    // Upload metadata.json to soul_assets
    const metadata = JSON.stringify({
      petName: petName || "",
      soulPageUrl: soulPageUrl || "",
      backText: backText || "",
      orderId,
      createdAt: new Date().toISOString(),
    }, null, 2);

    const metaPath = `${orderId}/metadata.json`;
    await supabase.storage
      .from("soul_assets")
      .upload(metaPath, new TextEncoder().encode(metadata), {
        contentType: "application/json",
        upsert: true,
      });

    // Update order in database with the design image URL
    const updatePayload: Record<string, string | null> = {
      design_image_url: results.frontEngravingUrl || null,
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from("animus_orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select("id, pet_photo_url, audio_url, soul_page_url, design_image_url")
      .maybeSingle();

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      verified: !!results.frontEngravingUrl,
      frontUrl: results.frontEngravingUrl || "",
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
