// Founders launch email sender via Resend.
// Triggered by admin from CRM → Founders' Circle. Sends the single launch email
// (40% Founders discount + coupon) to all live leads in waitlist_leads.
// Logs every send to campaign_sends. Copy/branding is hardcoded below to match
// the transactional order-confirmation email look.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESEND_API_URL = 'https://api.resend.com/emails'

// RESEND_FROM lets us swap the sender (e.g. the onboarding@resend.dev test domain
// vs a verified animuswaves.com address) without redeploying.
const FROM_ADDRESS = Deno.env.get('RESEND_FROM') || 'ANIMUS <onboarding@resend.dev>'

const CAMPAIGN_NAME = 'founders-launch'
const COUPON_CODE = 'FCB011'
const DISCOUNT_PERCENT = 40
const SUBJECT = "We're ready. Your 40% Founders discount is live."

interface Lead {
  id: string
  email: string
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// Mirrors the look of the transactional order-confirmation email:
// white background, Inter body / Playfair heading, gold (#B78E48) accents,
// centered wordmark, and a dashed coupon card.
function buildLaunchEmail(siteUrl: string) {
  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><title>${escapeHtml(SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',Arial,sans-serif;color:#0d0d0d;">
  <div style="max-width:520px;margin:0 auto;padding:40px 30px;">
    <p style="font-size:18px;font-weight:bold;letter-spacing:6px;text-align:center;color:#B78E48;margin:0 0 20px;">ANIMUS</p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;" />

    <h1 style="font-size:24px;font-weight:bold;color:#0d0d0d;margin:0 0 16px;font-family:'Playfair Display',Georgia,serif;">
      The wait is over.
    </h1>

    <p style="font-size:14px;color:#555555;line-height:1.6;margin:0 0 20px;">
      We've spent months refining every soundwave engraving and every detail of the Soul Page, because the memory you're keeping deserves nothing less. Today, ANIMUS is ready.
    </p>
    <p style="font-size:14px;color:#555555;line-height:1.6;margin:0 0 20px;">
      As one of our founders, your <strong>${DISCOUNT_PERCENT}% discount</strong> is live. Use the code below at checkout to claim your pendant.
    </p>

    <div style="border:1px dashed #B78E48;border-radius:8px;padding:20px 24px;margin:24px 0;text-align:center;background:#fdfaf4;">
      <p style="font-size:10px;letter-spacing:3px;color:#B78E48;font-weight:bold;margin:0 0 8px;">YOUR FOUNDERS DISCOUNT</p>
      <p style="font-size:18px;color:#0d0d0d;font-weight:bold;margin:0 0 12px;font-family:'Playfair Display',Georgia,serif;">${DISCOUNT_PERCENT}% off your pendant</p>
      <p style="font-size:22px;letter-spacing:4px;color:#0d0d0d;font-weight:bold;margin:0 0 8px;font-family:monospace;">${COUPON_CODE}</p>
      <p style="font-size:12px;color:#888888;margin:0;">Use this code at checkout.</p>
    </div>

    <div style="text-align:center;margin:30px 0;">
      <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#B78E48;color:#ffffff;padding:14px 32px;border-radius:4px;font-size:12px;letter-spacing:2px;font-weight:bold;text-decoration:none;">
        Claim Your Pendant
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;" />
    <p style="font-size:11px;color:#aaaaaa;text-align:center;margin:0;">© ${new Date().getFullYear()} ANIMUS. Crafted with love.</p>
  </div>
</body></html>`
  return { subject: SUBJECT, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: roles } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    if (!roles) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const baseUrl = String(body.baseUrl || 'https://animuswaves.com')
    const testEmail = body.testEmail ? String(body.testEmail) : null

    const { subject, html } = buildLaunchEmail(baseUrl)

    // Fetch leads (or single test recipient). Archived leads are excluded from bulk sends.
    let leads: Lead[] = []
    if (testEmail) {
      const { data } = await supabase
        .from('waitlist_leads')
        .select('id, email')
        .eq('email', testEmail.toLowerCase())
        .limit(1)
      leads = (data as Lead[]) || []
      if (leads.length === 0) {
        leads = [{ id: '00000000-0000-0000-0000-000000000000', email: testEmail }]
      }
    } else {
      const { data, error } = await supabase
        .from('waitlist_leads')
        .select('id, email')
        .is('archived_at', null)
      if (error) throw error
      leads = (data as Lead[]) || []
    }

    let sent = 0, failed = 0
    const errors: string[] = []

    for (const lead of leads) {
      try {
        const res = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [lead.email],
            subject,
            html,
          }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          failed++
          errors.push(`${lead.email}: ${JSON.stringify(data).slice(0, 200)}`)
          await supabase.from('campaign_sends').insert({
            campaign_name: CAMPAIGN_NAME,
            recipient_email: lead.email,
            lead_id: lead.id === '00000000-0000-0000-0000-000000000000' ? null : lead.id,
            status: 'failed',
            error_message: JSON.stringify(data).slice(0, 500),
          })
        } else {
          sent++
          await supabase.from('campaign_sends').insert({
            campaign_name: CAMPAIGN_NAME,
            recipient_email: lead.email,
            lead_id: lead.id === '00000000-0000-0000-0000-000000000000' ? null : lead.id,
            status: 'sent',
            resend_id: data?.id || null,
          })
        }
      } catch (e: any) {
        failed++
        errors.push(`${lead.email}: ${e.message}`)
      }

      // gentle pacing to avoid rate limits
      await new Promise(r => setTimeout(r, 100))
    }

    return new Response(JSON.stringify({
      ok: true,
      campaign: CAMPAIGN_NAME,
      total: leads.length,
      sent,
      failed,
      errors: errors.slice(0, 10),
      test: !!testEmail,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('send-campaign-email error:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
