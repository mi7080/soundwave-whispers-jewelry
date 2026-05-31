// Bulk campaign email sender via Resend
// Triggered by admin from dashboard. Sends Email 1 (status update) or Email 2 (referral)
// to all leads in waitlist_leads. Logs every send to campaign_sends.
//
// Body copy (subject + text fields) is editable from Admin → Settings → Campaign Emails
// and stored in public.campaign_email_content. The layout/branding below stays in code;
// any blank/missing field falls back to the DEFAULTS constant.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESEND_API_URL = 'https://connector-gateway.lovable.dev/resend/emails'

const FROM_ADDRESS = 'ANIMUS <onboarding@resend.dev>' // user can update once domain verified in Resend

interface Lead {
  id: string
  email: string
  referral_code: string | null
  referral_count: number
  extra_discount_percent: number
}

interface CampaignContent {
  subject: string
  fields: Record<string, string>
}

// Fallback copy — mirrors the seed in 20260528000000_admin_archive_and_campaign_content.sql.
const DEFAULTS: Record<'email1' | 'email2', CampaignContent> = {
  email1: {
    subject: "We're listening… and things are getting close 🕊️",
    fields: {
      heading: 'We hear you.',
      body: "Over the past weeks, we've read every comment, every message, every quiet request you've sent us. The voice notes you've saved on old phones. The laugh on a video that you can't bring yourself to delete. The song that played the day they were born — or the day they left.\n\nWe're listening. And we're working — slowly, carefully — to make sure ANIMUS captures these moments with the reverence they deserve. Every soundwave engraving is being refined. Every detail of the Soul Page is being polished. We refuse to ship anything less than perfect.\n\nThe launch for our first 300 Founders is coming soon. You'll be the first to know — and you'll keep your 40% Founders discount, locked in.",
      signature: 'Thank you for trusting us with this.\n— The ANIMUS Team',
    },
  },
  email2: {
    subject: 'Want your ANIMUS for free? (Or close to it…) 🎁',
    fields: {
      heading: "Your ANIMUS — for free.\nIt's possible.",
      intro: "You already have 40% OFF as a Founder. Now we're giving you a way to make your second pendant — for a parent, a partner, a sibling — almost free.",
      cta_label: 'Share Your Link',
      closing: 'Each friend who joins unlocks an extra discount code, sent to you when launch day arrives.',
      signature: '— The ANIMUS Team',
    },
  },
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// Split on blank lines → <p>; single newlines → <br/>.
function paragraphs(text: string, style: string) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((p) => `<p style="${style}">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
}

// Single newlines → <br/> (for headings/signatures).
function brLines(text: string) {
  return escapeHtml(String(text || '')).replace(/\n/g, '<br/>')
}

// Merge stored fields over defaults so a blank field never produces empty copy.
function resolveContent(campaign: 'email1' | 'email2', row: CampaignContent | null): CampaignContent {
  const def = DEFAULTS[campaign]
  const subject = row?.subject?.trim() || def.subject
  const fields: Record<string, string> = { ...def.fields }
  for (const [k, v] of Object.entries(row?.fields || {})) {
    if (typeof v === 'string' && v.trim() !== '') fields[k] = v
  }
  return { subject, fields }
}

function buildEmail1(content: CampaignContent) {
  const { subject } = content
  const f = content.fields
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;letter-spacing:-0.5px;margin:0 0 8px;">ANIMUS</h1>
    <div style="height:1px;background:#c9a84c;width:48px;margin:0 0 32px;"></div>

    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:400;line-height:1.4;margin:0 0 24px;color:#1a1a1a;">
      ${brLines(f.heading)}
    </h2>

    ${paragraphs(f.body, 'font-size:16px;line-height:1.7;color:#3a3a3a;margin:0 0 20px;')}

    <div style="border-top:1px solid #e8e4dd;padding-top:24px;margin-top:32px;">
      <p style="font-size:14px;color:#7a7a7a;line-height:1.6;margin:0;">
        ${brLines(f.signature)}
      </p>
    </div>
  </div>
</body></html>`
  return { subject, html }
}

function buildEmail2(lead: Lead, baseUrl: string, content: CampaignContent) {
  const refLink = lead.referral_code ? `${baseUrl}/?ref=${lead.referral_code}` : baseUrl
  const { subject } = content
  const f = content.fields
  const currentExtra = lead.extra_discount_percent
  const refCount = lead.referral_count

  const statusLine = refCount > 0
    ? `You've already referred <strong>${refCount}</strong> ${refCount === 1 ? 'friend' : 'friends'} — that's an extra <strong style="color:#c9a84c;">${currentExtra}% off</strong> on a second item, on top of your 40% Founders discount.`
    : `You haven't referred anyone yet — you're leaving free pendants on the table.`

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;letter-spacing:-0.5px;margin:0 0 8px;">ANIMUS</h1>
    <div style="height:1px;background:#c9a84c;width:48px;margin:0 0 32px;"></div>

    <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:400;line-height:1.4;margin:0 0 24px;color:#1a1a1a;">
      ${brLines(f.heading)}
    </h2>

    ${paragraphs(f.intro, 'font-size:16px;line-height:1.7;color:#3a3a3a;margin:0 0 20px;')}

    <div style="background:#faf8f5;border-left:3px solid #c9a84c;padding:20px 24px;margin:24px 0;">
      <p style="font-size:15px;line-height:1.7;color:#1a1a1a;margin:0 0 12px;font-weight:600;">
        For every friend who joins through your link:
      </p>
      <ul style="font-size:15px;line-height:1.9;color:#3a3a3a;margin:0;padding-left:20px;">
        <li><strong>1 friend</strong> = 20% off a second pendant</li>
        <li><strong>2 friends</strong> = 40% off</li>
        <li><strong>3 friends</strong> = 60% off</li>
        <li><strong>5 friends</strong> = <strong style="color:#c9a84c;">Second pendant FREE</strong></li>
      </ul>
    </div>

    <p style="font-size:15px;line-height:1.7;color:#3a3a3a;margin:0 0 24px;">
      ${statusLine}
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${escapeHtml(refLink)}" style="display:inline-block;background:#1a1a1a;color:#c9a84c;text-decoration:none;padding:16px 32px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;border:1px solid #c9a84c;">
        ${escapeHtml(f.cta_label)}
      </a>
    </div>

    <div style="background:#f5f3ee;padding:16px 20px;border-radius:4px;margin:24px 0;text-align:center;">
      <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7a7a7a;margin:0 0 8px;">Your unique link</p>
      <p style="font-size:14px;color:#1a1a1a;margin:0;word-break:break-all;font-family:Menlo,Monaco,monospace;">
        ${escapeHtml(refLink)}
      </p>
    </div>

    <p style="font-size:13px;line-height:1.6;color:#7a7a7a;margin:32px 0 0;text-align:center;">
      ${brLines(f.closing)}
    </p>

    <div style="border-top:1px solid #e8e4dd;padding-top:24px;margin-top:32px;">
      <p style="font-size:14px;color:#7a7a7a;line-height:1.6;margin:0;">${brLines(f.signature)}</p>
    </div>
  </div>
</body></html>`
  return { subject, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')
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
    const campaign = String(body.campaign || '')
    const baseUrl = String(body.baseUrl || 'https://animuswave.com')
    const testEmail = body.testEmail ? String(body.testEmail) : null

    if (!['email1', 'email2'].includes(campaign)) {
      return new Response(JSON.stringify({ error: 'Invalid campaign. Use email1 or email2.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load editable content for this campaign (falls back to DEFAULTS per-field)
    const { data: contentRow } = await supabase
      .from('campaign_email_content')
      .select('subject, fields')
      .eq('id', campaign)
      .maybeSingle()
    const content = resolveContent(campaign as 'email1' | 'email2', contentRow as CampaignContent | null)

    // Fetch leads (or single test lead). Archived leads are excluded from bulk sends.
    let leads: Lead[] = []
    if (testEmail) {
      const { data } = await supabase
        .from('waitlist_leads')
        .select('id, email, referral_code, referral_count, extra_discount_percent')
        .eq('email', testEmail.toLowerCase())
        .limit(1)
      leads = (data as Lead[]) || []
      if (leads.length === 0) {
        // synthetic lead for test send
        leads = [{ id: '00000000-0000-0000-0000-000000000000', email: testEmail, referral_code: 'preview', referral_count: 0, extra_discount_percent: 0 }]
      }
    } else {
      const { data, error } = await supabase
        .from('waitlist_leads')
        .select('id, email, referral_code, referral_count, extra_discount_percent')
        .is('archived_at', null)
      if (error) throw error
      leads = (data as Lead[]) || []
    }

    let sent = 0, failed = 0
    const errors: string[] = []

    for (const lead of leads) {
      const { subject, html } = campaign === 'email1' ? buildEmail1(content) : buildEmail2(lead, baseUrl, content)

      try {
        const res = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': RESEND_API_KEY,
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
            campaign_name: campaign,
            recipient_email: lead.email,
            lead_id: lead.id === '00000000-0000-0000-0000-000000000000' ? null : lead.id,
            status: 'failed',
            error_message: JSON.stringify(data).slice(0, 500),
          })
        } else {
          sent++
          await supabase.from('campaign_sends').insert({
            campaign_name: campaign,
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
      campaign,
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
