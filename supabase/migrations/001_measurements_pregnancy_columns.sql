ALTER TABLE public.measurements
  ADD COLUMN IF NOT EXISTS is_pregnant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_breastfeeding BOOLEAN DEFAULT false;
