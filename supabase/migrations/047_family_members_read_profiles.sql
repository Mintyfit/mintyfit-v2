-- Allow users in the same family to read each other's profile rows.
-- Without this, nested joins like `family_memberships.select('profile_id, profiles(...)')`
-- via the anon client return null for every member except the auth user themselves,
-- so the recipe page (and other family-scoped client UIs) cannot display member names,
-- weights, or BMI/BMR data.
--
-- The cross-membership join is on family_memberships only — no recursive sub-select
-- on profiles, so this does not reintroduce the 42P17 bug fixed in migration 046.

DROP POLICY IF EXISTS "Family members can read each other's profiles" ON public.profiles;
CREATE POLICY "Family members can read each other's profiles" ON public.profiles
  FOR SELECT USING (
    profiles.id IN (
      SELECT fm2.profile_id
      FROM public.family_memberships fm1
      JOIN public.family_memberships fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.profile_id = auth.uid()
    )
  );
