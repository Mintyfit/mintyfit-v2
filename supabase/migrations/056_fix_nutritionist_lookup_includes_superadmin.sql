-- ============================================================================
-- Migration 056: Fix nutritionist profile lookup to include super_admin
-- ============================================================================
-- The "Users lookup nutritionist profiles" policy only matched role='nutritionist'.
-- Super admins who apply as nutritionists keep their super_admin role (see the
-- apply route), so they were invisible in the connect-by-email flow. This fix
-- adds super_admin to the lookup policy.

DROP POLICY IF EXISTS "Users lookup nutritionist profiles" ON public.profiles;
CREATE POLICY "Users lookup nutritionist profiles" ON public.profiles
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (profiles.role = 'nutritionist' OR profiles.role = 'super_admin')
  );
