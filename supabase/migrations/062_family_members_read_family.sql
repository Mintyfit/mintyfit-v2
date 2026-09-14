-- ============================================================================
-- 062: Family members can read each other's memberships + managed members
-- ============================================================================
-- Bug: a linked member (e.g. Isabel) opening /plan saw only HERSELF in the
-- member list, so DayAgenda's per-meal consumer pills never rendered the rest
-- of the family — she could not mark who else eats a meal.
--
-- Root cause: RLS (migration 035) restricts
--   family_memberships SELECT → own rows OR family creator
--   managed_members     SELECT → managed_by = auth.uid() OR family creator
-- A linked member who didn't create the family therefore loads memberships
-- and managed children of nobody but herself.
-- (calendar_entries writes were already family-scoped by migration 049, and
-- the profiles cross-read policy from migration 047 starts working too once
-- co-member membership rows are visible.)
--
-- Fix: SECURITY DEFINER helper returns the caller's active family ids.
-- It bypasses RLS inside the function, so the policies below do NOT
-- self-reference family_memberships — no 42P17 infinite recursion
-- (the trap fixed in 046 / FIX_FAMILY_RLS.md).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.my_family_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id
  FROM public.family_memberships
  WHERE profile_id = auth.uid()
    AND status = 'active';
$$;

-- family_memberships: own rows, any row in own family, or family creator
DROP POLICY IF EXISTS "memberships_select" ON public.family_memberships;
CREATE POLICY "memberships_select" ON public.family_memberships
  FOR SELECT USING (
    profile_id = auth.uid()
    OR family_id IN (SELECT public.my_family_ids())
    OR EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
  );

-- managed_members: own managed rows, any managed row in own family, or family creator.
-- Writes stay restricted (managed_all from 035: managed_by / family creator) —
-- family members only need to READ the kids to tick them as meal consumers.
DROP POLICY IF EXISTS "managed_select" ON public.managed_members;
CREATE POLICY "managed_select" ON public.managed_members
  FOR SELECT USING (
    managed_by = auth.uid()
    OR family_id IN (SELECT public.my_family_ids())
    OR EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
  );
