-- Add missing columns that were not included in earlier migrations

-- ── profiles ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS units_preference       TEXT        DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS nutritionist_email     TEXT,
  ADD COLUMN IF NOT EXISTS nutritionist_sharing   BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_weekly_summary   BOOLEAN     DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_meal_reminders   BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_tips             BOOLEAN     DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ DEFAULT NOW();

-- ── family_members ───────────────────────────────────────────────────────────
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS gender        TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- ── nutritionist_client_links ─────────────────────────────────────────────────
ALTER TABLE public.nutritionist_client_links
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
