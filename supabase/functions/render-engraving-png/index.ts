import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: hasRole } = await admin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await admin
      .from("animus_orders")
      .select("id, svg_content, pet_name")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr || !order) throw new Error(orderErr?.message || "Order not found");
    if (!order.svg_content) throw new Error("Order has no SVG content");

    await ensureWasm();
    // Native 1000x1788 — no distortion, matches SVG canvas exactly
    const resvg = new Resvg(order.svg_content, {
      fitTo: { mode: "width", value: 1000 },
      background: "rgba(0,0,0,0)",
    });
    const png = resvg.render().asPng();

    const path = `${orderId}/engraving_print.png`;
    const { error: upErr } = await admin.storage
      .from("animus-production")
      .upload(path, png, { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: pub } = admin.storage.from("animus-production").getPublicUrl(path);
    const printUrl = pub?.publicUrl || "";

    await admin.from("animus_orders").update({ print_image_url: printUrl }).eq("id", orderId);

    return new Response(JSON.stringify({ success: true, print_image_url: printUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("render-engraving-png error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
