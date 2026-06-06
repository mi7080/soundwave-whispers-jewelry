// Quick check: latest email_send_log rows + queue/state health.
// Usage: npx tsx --env-file=supabase/functions/.env scripts/check-email-log.ts [email]
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let q = supabase
  .from("email_send_log")
  .select("created_at, template_name, recipient_email, status, error_message")
  .order("created_at", { ascending: false })
  .limit(10);
if (email) q = q.eq("recipient_email", email) as any;

const { data, error } = await q;
if (error) { console.error("✗ log:", error.message); } else { console.table(data); }

const { data: state, error: sErr } = await supabase
  .from("email_send_state")
  .select("retry_after_until, batch_size, send_delay_ms")
  .single();
if (sErr) console.error("✗ state:", sErr.message);
else console.log("send_state:", JSON.stringify(state));
