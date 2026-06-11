-- ============================================================================
-- Migration 055: Fix RLS gaps preventing nutritionist-client connection flow
-- ============================================================================

-- ── nutritionist_client_links: allow clients to read/manage their own links ──
DROP POLICY IF EXISTS "Clients read own links" ON public.nutritionist_client_links;
CREATE POLICY "Clients read own links" ON public.nutritionist_client_links
  FOR SELECT USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients manage own links" ON public.nutritionist_client_links;
CREATE POLICY "Clients manage own links" ON public.nutritionist_client_links
  FOR ALL USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

-- ── profiles: allow authenticated users to look up nutritionist profiles ────
-- Needed for the connect-by-email flow where a client searches for a nutritionist
DROP POLICY IF EXISTS "Users lookup nutritionist profiles" ON public.profiles;
CREATE POLICY "Users lookup nutritionist profiles" ON public.profiles
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (profiles.role = 'nutritionist' OR profiles.role = 'super_admin')
  );

-- ── nutritionist_invites: allow recipients to read/accept their own invites ──
DROP POLICY IF EXISTS "Recipients read own invites" ON public.nutritionist_invites;
CREATE POLICY "Recipients read own invites" ON public.nutritionist_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = nutritionist_invites.email
    )
  );

DROP POLICY IF EXISTS "Recipients update own invites" ON public.nutritionist_invites;
CREATE POLICY "Recipients update own invites" ON public.nutritionist_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = nutritionist_invites.email
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = nutritionist_invites.email
    )
  );
