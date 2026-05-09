-- Fix: profiles RLS policies that query profiles from within profiles cause infinite recursion (42P17)
-- Replace sub-selects on profiles with auth.jwt() role check for super_admin detection

DROP POLICY IF EXISTS "Super admins read all profiles" ON public.profiles;
CREATE POLICY "Super admins read all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'user_role') = 'super_admin'
  );

DROP POLICY IF EXISTS "Super admins update all profiles" ON public.profiles;
CREATE POLICY "Super admins update all profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'user_role') = 'super_admin'
  ) WITH CHECK (
    auth.uid() = id
    OR (auth.jwt() ->> 'user_role') = 'super_admin'
  );
