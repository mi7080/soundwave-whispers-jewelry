import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Singleton WASM init — shared across warm invocations
let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const wasmRes = await fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm");
      const wasmBytes = await wasmRes.arrayBuffer();
      await initWasm(wasmBytes);
    })();
  }
  return wasmReady;
}

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

    // ── 1. Upload SVG ────────────────────────────────────────────────────────
    const svgBytes = new TextEncoder().encode(svgContent);
    const svgPath = `${orderId}/final_engraving_design.svg`;
    const { error: svgErr } = await supabase.storage
      .from("production_assets")
      .upload(svgPath, svgBytes, { contentType: "image/svg+xml", upsert: true });

    if (svgErr) throw new Error(`SVG upload failed: ${svgErr.message}`);

    const { data: svgUrlData } = supabase.storage.from("production_assets").getPublicUrl(svgPath);
    const frontEngravingUrl = svgUrlData?.publicUrl || "";

    // ── 2. Render SVG → PNG and save as print_image_url (pre-emptive) ────────
    // Non-blocking: a render failure must not prevent checkout from completing.
    // The webhook's pickShineOnPrintUrl will find this URL first and skip any
    // SVG fallback, making ShineOn submission instant and fail-safe.
    // If all retries fail we log to email_send_log so the admin UI surfaces it
    // and an operator can manually re-render via render-engraving-png.
    let printImageUrl = "";
    const svg = svgContent.trim();
    const hasRoot = /<svg[\s>][\s\S]*<\/svg>/i.test(svg);
    const hasContent = /<(rect|path|circle|g|text|polygon|polyline|line|image)\b/i.test(svg);

    if (!hasRoot || !hasContent) {
      console.warn(`[upload-production-assets] SVG for ${orderId} is a placeholder — PNG render skipped`);
    } else {
      const MAX_PNG_ATTEMPTS = 2;
      let lastPngError: unknown = null;

      for (let attempt = 1; attempt <= MAX_PNG_ATTEMPTS; attempt++) {
        try {
          if (attempt > 1) {
            // Brief pause before retry so a transient WASM cold-start can settle.
            await new Promise((r) => setTimeout(r, 800));
            console.log(`[upload-production-assets] PNG render retry ${attempt} for ${orderId}`);
          }
          await ensureWasm();
          const resvg = new Resvg(svg, {
            fitTo: { mode: "width", value: 1000 },
            background: "rgba(0,0,0,0)",
          });
          const png = resvg.render().asPng();

          const pngPath = `${orderId}/engraving_print.png`;
          const { error: pngErr } = await supabase.storage
            .from("animus-production")
            .upload(pngPath, png, { contentType: "image/png", upsert: true });

          if (pngErr) {
            throw new Error(`PNG storage upload failed: ${pngErr.message}`);
          }

          const { data: pngUrlData } = supabase.storage.from("animus-production").getPublicUrl(pngPath);
          printImageUrl = pngUrlData?.publicUrl || "";
          console.log(`[upload-production-assets] ✓ PNG pre-generated for ${orderId} (attempt ${attempt}): ${printImageUrl}`);
          lastPngError = null;
          break; // success — exit retry loop
        } catch (pngErr) {
          lastPngError = pngErr;
          console.error(`[upload-production-assets] PNG render attempt ${attempt} failed for ${orderId}:`, pngErr);
        }
      }

      if (lastPngError) {
        // All retries exhausted — log an admin alert so the order can be manually recovered
        // via the render-engraving-png edge function before the iCount webhook fires.
        console.error(`[upload-production-assets] ✗ All PNG render attempts failed for ${orderId} — writing admin alert`);
        try {
          await supabase.from("email_send_log").insert({
            template_name: "png-render-failed",
            recipient_email: "system@animuswave.com",
            status: "error",
            error_message: `PNG pre-render failed for order ${orderId} after ${MAX_PNG_ATTEMPTS} attempts: ${String(lastPngError)}`.slice(0, 4000),
            metadata: { orderId, action: "re-run render-engraving-png to recover" },
          } as any);
        } catch (logErr) {
          console.error("[upload-production-assets] Failed to write PNG failure alert:", logErr);
        }
      }
    }

    // ── 3. Upload metadata.json ───────────────────────────────────────────────
    const metadata = JSON.stringify({
      petName: petName || "",
      soulPageUrl: soulPageUrl || "",
      backText: backText || "",
      orderId,
      createdAt: new Date().toISOString(),
    }, null, 2);

    await supabase.storage
      .from("soul_assets")
      .upload(`${orderId}/metadata.json`, new TextEncoder().encode(metadata), {
        contentType: "application/json",
        upsert: true,
      });

    // ── 4. Persist both URLs to the order ────────────────────────────────────
    const updatePayload: Record<string, string | null> = {
      design_image_url: frontEngravingUrl || null,
      ...(printImageUrl ? { print_image_url: printImageUrl } : {}),
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from("animus_orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select("id, pet_photo_url, audio_url, soul_page_url, design_image_url, print_image_url")
      .maybeSingle();

    if (updateError) throw new Error(`Database update failed: ${updateError.message}`);

    return new Response(JSON.stringify({
      success: true,
      verified: !!frontEngravingUrl,
      frontUrl: frontEngravingUrl,
      printUrl: printImageUrl,
      persistedOrder: updatedOrder,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[upload-production-assets] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
