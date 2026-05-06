-- Session 3: Stripe, Nutritionist Dashboard, Admin Dashboard
-- Run in Supabase SQL Editor

-- ─── profiles: add subscription_tier + status ─────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ─── subscriptions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT DEFAULT 'inactive',
  tier                   TEXT DEFAULT 'free',
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own subscription" ON public.subscriptions;
CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ─── nutritionist_client_links ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nutritionist_client_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status           TEXT DEFAULT 'pending',   -- pending | active | inactive
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nutritionist_id, client_id)
);
ALTER TABLE public.nutritionist_client_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Nutritionists read own links" ON public.nutritionist_client_links;
CREATE POLICY "Nutritionists read own links" ON public.nutritionist_client_links
  FOR SELECT USING (auth.uid() = nutritionist_id);
DROP POLICY IF EXISTS "Nutritionists manage own links" ON public.nutritionist_client_links;
CREATE POLICY "Nutritionists manage own links" ON public.nutritionist_client_links
  FOR ALL USING (auth.uid() = nutritionist_id);

-- ─── nutritionist_notes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nutritionist_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content          TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.nutritionist_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Nutritionists manage own notes" ON public.nutritionist_notes;
CREATE POLICY "Nutritionists manage own notes" ON public.nutritionist_notes
  FOR ALL USING (auth.uid() = nutritionist_id);

-- ─── audit_logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email  TEXT,
  action       TEXT NOT NULL,
  target_id    UUID,
  target_type  TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins read audit logs" ON public.audit_logs;
CREATE POLICY "Super admins read audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
DROP POLICY IF EXISTS "Service role insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ─── gdpr_requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email    TEXT,
  request_type  TEXT DEFAULT 'export',  -- export | delete
  status        TEXT DEFAULT 'pending', -- pending | approved | denied
  requested_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own gdpr requests" ON public.gdpr_requests;
CREATE POLICY "Users read own gdpr requests" ON public.gdpr_requests
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own gdpr requests" ON public.gdpr_requests;
CREATE POLICY "Users insert own gdpr requests" ON public.gdpr_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Super admins manage gdpr requests" ON public.gdpr_requests;
CREATE POLICY "Super admins manage gdpr requests" ON public.gdpr_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ─── Super admin: read all profiles ────────────────────────────────────────
DROP POLICY IF EXISTS "Super admins read all profiles" ON public.profiles;
CREATE POLICY "Super admins read all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
DROP POLICY IF EXISTS "Super admins update all profiles" ON public.profiles;
CREATE POLICY "Super admins update all profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
