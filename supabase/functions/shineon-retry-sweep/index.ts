// ShineOn auto-retry sweep.
//
// Picks up orders whose ShineOn submission failed transiently and whose backoff
// window has elapsed, then re-runs them through the normal payment webhook so
// transient outages (5xx/429/408/network) self-heal without manual recovery.
// Permanent failures (other 4xx, missing print asset) set shineon_next_retry_at
// to NULL in the webhook and are therefore never picked up here — they surface
// in the admin "Needs Attention" view for a human.
//
// ── Scheduling ──────────────────────────────────────────────────────
// Run every 15 minutes via pg_cron + pg_net (Supabase). One-time setup
// (replace <PROJECT_REF> and store the service role key in Vault):
//
//   select cron.schedule(
//     'shineon-retry-sweep',
//     '*/15 * * * *',
//     $$
//     select net.http_post(
//       url     := 'https://<PROJECT_REF>.functions.supabase.co/shineon-retry-sweep',
//       headers := jsonb_build_object(
//         'Content-Type', 'application/json',
//         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
//       ),
//       body    := '{}'::jsonb
//     );
//     $$
//   );

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SHINEON_MAX_RETRIES } from "../icount-payment-webhook/helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("ICOUNT_WEBHOOK_SECRET") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const nowIso = new Date().toISOString();
    const { data: due, error } = await supabase
      .from("animus_orders")
      .select("id, customer_email, customer_name, icount_docnum, amount, shineon_retry_count")
      .eq("status", "shineon_error")
      .lt("shineon_retry_count", SHINEON_MAX_RETRIES)
      .not("shineon_next_retry_at", "is", null)
      .lte("shineon_next_retry_at", nowIso)
      .order("shineon_next_retry_at", { ascending: true })
      .limit(10);

    if (error) {
      console.error("[ShineOn Sweep] Query failed:", error.message);
      return json({ success: false, error: error.message }, 500);
    }

    const results: { orderId: string; outcome: string }[] = [];

    for (const o of due ?? []) {
      try {
        // The webhook treats shineon_error as finalized (idempotency guard), so
        // reset to payment_pending the same way the admin manual retry does.
        await supabase.from("animus_orders").update({ status: "payment_pending" }).eq("id", o.id);

        const resp = await fetch(`${supabaseUrl}/functions/v1/icount-payment-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            secret: webhookSecret,
            order_id: o.id,
            status: "paid",
            client_email: o.customer_email,
            client_name: o.customer_name,
            docnum: o.icount_docnum,
            amount: o.amount,
          }),
        });
        const data = await resp.json().catch(() => ({}));

        if (data?.shineon_submitted) results.push({ orderId: o.id, outcome: "fulfilled" });
        else if (data?.shineon_error) results.push({ orderId: o.id, outcome: data.will_retry ? "retry_scheduled" : "permanent_error" });
        else results.push({ orderId: o.id, outcome: data?.reason || "no_submission" });
      } catch (e: any) {
        // If we couldn't even reach the webhook, put the order back into the
        // error state so it stays visible and eligible for the next sweep.
        await supabase
          .from("animus_orders")
          .update({ status: "shineon_error" })
          .eq("id", o.id)
          .eq("status", "payment_pending");
        console.error(`[ShineOn Sweep] Retry failed for ${o.id}:`, e?.message);
        results.push({ orderId: o.id, outcome: "sweep_error" });
      }
    }

    console.log(`[ShineOn Sweep] Processed ${results.length} order(s):`, JSON.stringify(results));
    return json({ success: true, processed: results.length, results });
  } catch (err: any) {
    console.error("[ShineOn Sweep] Unexpected error:", err);
    return json({ success: false, error: err?.message || "unknown" }, 500);
  }
});
