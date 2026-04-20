import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ICOUNT_API_BASE = "https://api.icount.co.il/api/v3.php";

// iCount doctype for "חשבונית מס/קבלה" (Invoice Receipt) is "invrec"
const INVREC_DOCTYPES = new Set(["invrec", "invoice_receipt", "invoicereceipt"]);

interface FindRequest {
  orderId: string;
  email?: string; // optional override
}

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("iCount timeout")), ms)),
  ]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderId, email: emailOverride } = (await req.json()) as FindRequest;
    if (!orderId) return json({ success: false, error: "orderId is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderErr } = await supabase
      .from("animus_orders")
      .select("id, customer_email, icount_docnum")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) return json({ success: false, error: "Order not found" }, 404);

    if (order.icount_docnum) {
      return json({ success: true, found: false, reason: "already_linked", docnum: order.icount_docnum });
    }

    const email = (emailOverride || order.customer_email || "").trim().toLowerCase();
    if (!email) return json({ success: true, found: false, reason: "no_email" });

    const apiToken = Deno.env.get("ICOUNT_API_TOKEN");
    if (!apiToken) return json({ success: false, error: "ICOUNT_API_TOKEN not configured" }, 500);

    // iCount doc/search — search by client email
    let icountData: any;
    try {
      const res = await withTimeout(
        fetch(`${ICOUNT_API_BASE}/doc/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sid: apiToken, client_email: email, doctype: "invrec" }),
        }),
        15000
      );
      const text = await res.text();
      try {
        icountData = JSON.parse(text);
      } catch {
        console.error("[find-docnum] Non-JSON response:", text.slice(0, 300));
        return json({ success: false, fallback: true, error: "Invalid iCount response" });
      }
      if (!res.ok || icountData?.status === false) {
        return json({ success: false, fallback: true, error: icountData?.reason || `iCount HTTP ${res.status}` });
      }
    } catch (err: any) {
      console.error("[find-docnum] iCount call failed:", err?.message);
      return json({ success: false, fallback: true, error: err?.message || "iCount unreachable" });
    }

    // Normalize results — iCount returns { status:true, docs:[...] } or similar
    const docs: any[] = icountData.docs || icountData.documents || icountData.data || [];
    if (!Array.isArray(docs) || docs.length === 0) {
      return json({ success: true, found: false, reason: "no_match" });
    }

    // Filter to invoice-receipt and not already linked to another order
    const candidates = docs.filter((d) => {
      const dt = String(d.doctype || d.doc_type || "").toLowerCase();
      return INVREC_DOCTYPES.has(dt) || dt.includes("invrec");
    });

    const pool = candidates.length > 0 ? candidates : docs;

    // Get docnums already linked to other orders so we don't double-link
    const { data: existingLinks } = await supabase
      .from("animus_orders")
      .select("icount_docnum")
      .not("icount_docnum", "is", null);
    const usedDocnums = new Set((existingLinks || []).map((r: any) => String(r.icount_docnum)));

    // Sort by date desc and pick most recent unused
    const sorted = [...pool].sort((a, b) => {
      const da = new Date(a.doc_date || a.date || a.created_at || 0).getTime();
      const db = new Date(b.doc_date || b.date || b.created_at || 0).getTime();
      return db - da;
    });

    let chosen: any = null;
    for (const d of sorted) {
      const dn = String(d.docnum || d.doc_number || d.invoice_number || "").trim();
      if (dn && !usedDocnums.has(dn)) {
        chosen = { ...d, _docnum: dn };
        break;
      }
    }

    if (!chosen) return json({ success: true, found: false, reason: "all_linked" });

    const docnum = chosen._docnum;

    const { error: updateErr } = await supabase
      .from("animus_orders")
      .update({ icount_docnum: docnum, icount_docnum_auto_detected: true })
      .eq("id", orderId);

    if (updateErr) {
      console.error("[find-docnum] DB update failed:", updateErr);
      return json({ success: false, error: "Failed to save docnum" }, 500);
    }

    return json({ success: true, found: true, docnum, auto_detected: true });
  } catch (err: any) {
    console.error("[find-docnum] Unexpected:", err);
    // Never break the calling flow — return 200 + fallback
    return json({ success: false, fallback: true, error: err?.message || "Unknown error" });
  }
});
