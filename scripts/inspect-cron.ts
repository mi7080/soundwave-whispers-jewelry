// Inspect email-queue cron/scheduler state. Reads SUPABASE_DB_URL from env-file.
// Usage: npx tsx --env-file=supabase/functions/.env scripts/inspect-cron.ts
import { execFileSync } from "node:child_process";

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) { console.error("✗ SUPABASE_DB_URL missing from env file."); process.exit(1); }

const q = (label: string, sql: string) => {
  console.log(`\n=== ${label} ===`);
  try {
    const out = execFileSync("psql", [dbUrl, "-X", "-A", "-F", " | ", "-c", sql], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    console.log(out.trim() || "(no rows)");
  } catch (e: any) {
    console.error("ERR:", (e.stderr || e.message || "").toString().trim());
  }
};

q("extensions", "select extname from pg_extension where extname in ('pg_cron','pg_net') order by extname;");
q("cron jobs", "select jobid, schedule, active, left(command, 60) as cmd from cron.job order by jobid;");
q("vault secret", "select name from vault.secrets where name = 'email_queue_service_role_key';");
q("queue depth", "select 'transactional' q, count(*) from pgmq.q_transactional_emails union all select 'auth', count(*) from pgmq.q_auth_emails;");
