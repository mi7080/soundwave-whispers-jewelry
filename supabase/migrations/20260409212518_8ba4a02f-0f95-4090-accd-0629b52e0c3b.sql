
CREATE TABLE public.waitlist_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit to waitlist"
ON public.waitlist_leads
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view waitlist"
ON public.waitlist_leads
FOR SELECT
USING (true);
