-- promotions: superadmin-managed promotional pricing codes
CREATE TABLE IF NOT EXISTS public.promotions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT         NOT NULL UNIQUE,
  label            TEXT         NOT NULL,          -- e.g. "March Sale"
  description      TEXT         NOT NULL DEFAULT '',
  discount_percent INTEGER      NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  active           BOOLEAN      NOT NULL DEFAULT false,
  start_date       DATE,
  end_date         DATE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active promotions (needed for public pricing page)
CREATE POLICY "Public read active promotions"
  ON public.promotions
  FOR SELECT
  USING (active = true);

-- Super admin can manage all promotions
CREATE POLICY "Superadmin manage promotions"
  ON public.promotions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Seed: March launch promotion
INSERT INTO public.promotions (code, label, description, discount_percent, active, start_date, end_date)
VALUES (
  'MARCH30',
  'March Launch Sale',
  'Save 30% — March only!',
  30,
  true,
  '2026-03-01',
  '2026-03-31'
) ON CONFLICT (code) DO NOTHING;
