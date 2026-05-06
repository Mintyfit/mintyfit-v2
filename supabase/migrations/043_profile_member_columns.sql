-- ============================================================================
-- Add physical/demographic columns to profiles and managed_members
-- Needed for family member nutrition calculations (BMI, BMR, daily needs)
-- ============================================================================

-- ── profiles: add member data columns ───────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS weight NUMERIC,
  ADD COLUMN IF NOT EXISTS height NUMERIC,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS daily_calories_target NUMERIC;

-- ── managed_members: add derived columns ────────────────────────────────────
ALTER TABLE public.managed_members
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS daily_calories_target NUMERIC;
