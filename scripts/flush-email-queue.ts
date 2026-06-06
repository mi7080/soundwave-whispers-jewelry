// Manually invoke process-email-queue to flush pending emails.
// Usage: npx tsx --env-file=supabase/functions/.env scripts/flush-email-queue.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const { data, error } = await supabase.functions.invoke("process-email-queue", { body: {} });
if (error) {
  console.error("✗ invoke failed:", error.message ?? error);
  // surface the response body when available
  if ((error as any).context) {
    try { console.error("body:", await (error as any).context.text()); } catch {}
  }
  process.exit(1);
}
console.log("← dispatcher response:", JSON.stringify(data));
