-- ============================================================================
-- DISABLE OLD MEMBER SYSTEM (family_members table)
-- ============================================================================
-- This disables the old "Member system" (family_members table) to prevent
-- conflicts with the new Family system (families + family_memberships tables).
-- 
-- The old system allowed one user to manage multiple "members" under them.
-- The new system links multiple user accounts into a family.
--
-- This migration:
-- 1. Drops all RLS policies on family_members and measurements
-- 2. Revokes all permissions on these tables
-- 3. Keeps the tables intact for future reference
-- ============================================================================

-- ============================================================================
-- 1. Drop all policies on family_members
-- ============================================================================

-- Find and drop all policies on family_members
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'family_members' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.family_members', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- 2. Drop all policies on measurements
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'measurements' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.measurements', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- 3. Revoke permissions (keep tables but make them inaccessible)
-- ============================================================================

-- Revoke all permissions on family_members
REVOKE ALL ON TABLE public.family_members FROM authenticated;
REVOKE ALL ON TABLE public.family_members FROM anon;
REVOKE ALL ON TABLE public.family_members FROM public;

-- Revoke all permissions on measurements
REVOKE ALL ON TABLE public.measurements FROM authenticated;
REVOKE ALL ON TABLE public.measurements FROM anon;
REVOKE ALL ON TABLE public.measurements FROM public;

-- ============================================================================
-- 4. Disable RLS (policies are gone, but turn off RLS for safety)
-- ============================================================================

ALTER TABLE public.family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements DISABLE ROW LEVEL SECURITY;
