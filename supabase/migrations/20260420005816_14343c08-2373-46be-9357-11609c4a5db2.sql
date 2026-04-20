-- Cost settings (single-row config)
CREATE TABLE public.cost_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  shineon_unit_cost NUMERIC NOT NULL DEFAULT 15.00,
  transaction_fee_percent NUMERIC NOT NULL DEFAULT 2.9,
  transaction_fee_fixed NUMERIC NOT NULL DEFAULT 0.30,
  monthly_ad_spend NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT cost_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.cost_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cost settings"
  ON public.cost_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cost settings"
  ON public.cost_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert cost settings"
  ON public.cost_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_cost_settings_updated_at
  BEFORE UPDATE ON public.cost_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cost_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;