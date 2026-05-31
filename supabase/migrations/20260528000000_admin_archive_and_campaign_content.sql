-- Admin: soft-delete (archive) support for orders + leads, and editable campaign email content.

-- 1. Archive columns (soft delete = set archived_at; restore = NULL it)
ALTER TABLE public.animus_orders  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.waitlist_leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_animus_orders_archived_at  ON public.animus_orders(archived_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_leads_archived_at ON public.waitlist_leads(archived_at);

-- Admins already have UPDATE policies on both tables (see 20260419110131), so
-- toggling archived_at needs no new permissions.

-- 2. Editable campaign email content (Email 1 / Email 2 body copy)
CREATE TABLE IF NOT EXISTS public.campaign_email_content (
  id TEXT PRIMARY KEY CHECK (id IN ('email1', 'email2')),
  subject TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_email_content ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage campaign content"
    ON public.campaign_email_content FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role reads campaign content"
    ON public.campaign_email_content FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Seed with the current hardcoded copy (plain-text fields; layout stays in code)
INSERT INTO public.campaign_email_content (id, subject, fields) VALUES
(
  'email1',
  'We''re listening… and things are getting close 🕊️',
  jsonb_build_object(
    'heading', 'We hear you.',
    'body', E'Over the past weeks, we''ve read every comment, every message, every quiet request you''ve sent us. The voice notes you''ve saved on old phones. The laugh on a video that you can''t bring yourself to delete. The song that played the day they were born — or the day they left.\n\nWe''re listening. And we''re working — slowly, carefully — to make sure ANIMUS captures these moments with the reverence they deserve. Every soundwave engraving is being refined. Every detail of the Soul Page is being polished. We refuse to ship anything less than perfect.\n\nThe launch for our first 300 Founders is coming soon. You''ll be the first to know — and you''ll keep your 40% Founders discount, locked in.',
    'signature', E'Thank you for trusting us with this.\n— The ANIMUS Team'
  )
),
(
  'email2',
  'Want your ANIMUS for free? (Or close to it…) 🎁',
  jsonb_build_object(
    'heading', E'Your ANIMUS — for free.\nIt''s possible.',
    'intro', 'You already have 40% OFF as a Founder. Now we''re giving you a way to make your second pendant — for a parent, a partner, a sibling — almost free.',
    'cta_label', 'Share Your Link',
    'closing', 'Each friend who joins unlocks an extra discount code, sent to you when launch day arrives.',
    'signature', '— The ANIMUS Team'
  )
)
ON CONFLICT (id) DO NOTHING;
