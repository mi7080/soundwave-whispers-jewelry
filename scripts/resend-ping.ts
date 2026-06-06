// Diagnostic: call Resend directly and print the raw status + body.
// Usage: npx tsx --env-file=supabase/functions/.env scripts/resend-ping.ts [toEmail]
const key = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM || "ANIMUS <onboarding@resend.dev>";
const to = process.argv[2] || "adir.yed@gmail.com";

if (!key) { console.error("✗ RESEND_API_KEY missing from env file."); process.exit(1); }
console.log(`key prefix: ${key.slice(0, 6)}…  from: ${from}  to: ${to}`);

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
  body: JSON.stringify({ from, to, subject: "ANIMUS Resend test", html: "<p>Resend direct test ✅</p>" }),
});
console.log(`← HTTP ${res.status}`);
console.log(await res.text());
