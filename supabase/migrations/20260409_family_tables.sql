-- Session 07: Family tables
-- Note: nutritionist_client_links and nutritionist_notes already exist in 20260224_session3_tables.sql

-- ─── families ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'My Family',
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Family members can read family"
  ON public.families FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = id AND fm.profile_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Family admin can manage family"
  ON public.families FOR ALL
  USING (auth.uid() = created_by);

-- ─── family_memberships ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'co-admin', 'member')),
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (family_id, profile_id)
);

ALTER TABLE public.family_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Members can read family memberships"
  ON public.family_memberships FOR SELECT
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.family_memberships fm2
      WHERE fm2.family_id = family_id AND fm2.profile_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Admins manage family memberships"
  ON public.family_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND f.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = family_id AND fm.profile_id = auth.uid() AND fm.role IN ('admin', 'co-admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Members can remove themselves"
  ON public.family_memberships FOR DELETE
  USING (profile_id = auth.uid());

-- ─── managed_members ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.managed_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  managed_by       UUID NOT NULL REFERENCES public.profiles(id),
  name             TEXT NOT NULL,
  date_of_birth    DATE,
  gender           TEXT,
  weight           NUMERIC,
  height           NUMERIC,
  allergies        TEXT[] DEFAULT '{}',
  activity_profiles JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.managed_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Family members read managed members"
  ON public.managed_members FOR SELECT
  USING (
    managed_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = family_id AND fm.profile_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Admins manage managed members"
  ON public.managed_members FOR ALL
  USING (
    managed_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = family_id AND fm.profile_id = auth.uid() AND fm.role IN ('admin', 'co-admin')
    )
  );

-- ─── family_invites ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES public.profiles(id),
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ DEFAULT now() + interval '7 days'
);

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins manage invites"
  ON public.family_invites FOR ALL
  USING (
    invited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = family_id AND fm.profile_id = auth.uid() AND fm.role IN ('admin', 'co-admin')
    )
  );

-- Allow reading invite by token (for acceptance flow — anon or auth)
CREATE POLICY IF NOT EXISTS "Anyone can read invite by token"
  ON public.family_invites FOR SELECT
  USING (true);

-- ─── weight_logs (for My Profile weight tracking) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight      NUMERIC NOT NULL,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, logged_date)
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own weight logs"
  ON public.weight_logs FOR ALL
  USING (auth.uid() = profile_id);

-- Nutritionist can read client weight logs
CREATE POLICY IF NOT EXISTS "Nutritionist reads client weight logs"
  ON public.weight_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_client_links ncl
      WHERE ncl.nutritionist_id = auth.uid() AND ncl.client_id = profile_id AND ncl.status = 'active'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_memberships_family_id ON public.family_memberships(family_id);
CREATE INDEX IF NOT EXISTS idx_family_memberships_profile_id ON public.family_memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_managed_members_family_id ON public.managed_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_token ON public.family_invites(token);
CREATE INDEX IF NOT EXISTS idx_family_invites_email ON public.family_invites(email);
CREATE INDEX IF NOT EXISTS idx_weight_logs_profile_date ON public.weight_logs(profile_id, logged_date DESC);
