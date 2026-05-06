-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-04-28  Email-based invites + nutritionist self-serve application
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles: nutritionist application columns ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved        BOOLEAN     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN     DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS bio                TEXT,
  ADD COLUMN IF NOT EXISTS credentials_url    TEXT,
  ADD COLUMN IF NOT EXISTS applied_at         TIMESTAMPTZ;

-- ── nutritionist_invites: nutritionist invites a client by email ────────────
CREATE TABLE IF NOT EXISTS public.nutritionist_invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  token            UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | cancelled | expired
  message          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  accepted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_nutritionist_invites_token ON public.nutritionist_invites(token);
CREATE INDEX IF NOT EXISTS idx_nutritionist_invites_email ON public.nutritionist_invites(email);
CREATE INDEX IF NOT EXISTS idx_nutritionist_invites_nut   ON public.nutritionist_invites(nutritionist_id);

ALTER TABLE public.nutritionist_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nutritionists manage own invites" ON public.nutritionist_invites;
CREATE POLICY "Nutritionists manage own invites" ON public.nutritionist_invites
  FOR ALL USING (auth.uid() = nutritionist_id) WITH CHECK (auth.uid() = nutritionist_id);

-- Anyone can read by token (needed for the accept page when not yet logged in via API).
-- We rely on the API route using the service role for the lookup.
