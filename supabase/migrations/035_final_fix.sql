-- ============================================================================
-- FINAL FIX: Explicit policies for each operation
-- ============================================================================
-- Run this ONCE in Supabase SQL Editor
-- ============================================================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "families_creator_all" ON public.families;
DROP POLICY IF EXISTS "Family creator can read family" ON public.families;
DROP POLICY IF EXISTS "Family creator can manage family" ON public.families;
DROP POLICY IF EXISTS "Family members can read family" ON public.families;
DROP POLICY IF EXISTS "Family admin can manage family" ON public.families;

DROP POLICY IF EXISTS "memberships_select" ON public.family_memberships;
DROP POLICY IF EXISTS "memberships_insert" ON public.family_memberships;
DROP POLICY IF EXISTS "memberships_update" ON public.family_memberships;
DROP POLICY IF EXISTS "memberships_delete" ON public.family_memberships;
DROP POLICY IF EXISTS "User can read own membership" ON public.family_memberships;
DROP POLICY IF EXISTS "Family creator can insert memberships" ON public.family_memberships;
DROP POLICY IF EXISTS "Family creator can update memberships" ON public.family_memberships;
DROP POLICY IF EXISTS "User can delete own membership" ON public.family_memberships;
DROP POLICY IF EXISTS "Members can read family memberships" ON public.family_memberships;
DROP POLICY IF EXISTS "Admins manage family memberships" ON public.family_memberships;
DROP POLICY IF EXISTS "Members can remove themselves" ON public.family_memberships;

DROP POLICY IF EXISTS "managed_select" ON public.managed_members;
DROP POLICY IF EXISTS "managed_all" ON public.managed_members;
DROP POLICY IF EXISTS "Family members read managed members" ON public.managed_members;
DROP POLICY IF EXISTS "Admins manage managed members" ON public.managed_members;
DROP POLICY IF EXISTS "Family creator read managed members" ON public.managed_members;
DROP POLICY IF EXISTS "Family creator manage managed members" ON public.managed_members;

DROP POLICY IF EXISTS "invites_all" ON public.family_invites;
DROP POLICY IF EXISTS "invites_read_token" ON public.family_invites;
DROP POLICY IF EXISTS "Admins manage invites" ON public.family_invites;
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.family_invites;
DROP POLICY IF EXISTS "Family creator manages invites" ON public.family_invites;

-- ============================================================================
-- Create EXPLICIT policies for each operation
-- ============================================================================

-- families: Creator can INSERT (for creating new families)
CREATE POLICY "families_insert" ON public.families
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- families: Creator can SELECT their own families
CREATE POLICY "families_select" ON public.families
    FOR SELECT USING (created_by = auth.uid());

-- families: Creator can UPDATE their own families
CREATE POLICY "families_update" ON public.families
    FOR UPDATE USING (created_by = auth.uid());

-- families: Creator can DELETE their own families
CREATE POLICY "families_delete" ON public.families
    FOR DELETE USING (created_by = auth.uid());

-- family_memberships: User can SELECT their own memberships OR if they created the family
CREATE POLICY "memberships_select" ON public.family_memberships
    FOR SELECT USING (
        profile_id = auth.uid() OR
        EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
    );

-- family_memberships: Family creator can INSERT memberships
CREATE POLICY "memberships_insert" ON public.family_memberships
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
    );

-- family_memberships: Family creator can UPDATE memberships
CREATE POLICY "memberships_update" ON public.family_memberships
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
    );

-- family_memberships: User can DELETE their own membership OR family creator can delete any
CREATE POLICY "memberships_delete" ON public.family_memberships
    FOR DELETE USING (
        profile_id = auth.uid() OR
        EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
    );

-- managed_members: User can SELECT if they created it or family creator
CREATE POLICY "managed_select" ON public.managed_members
    FOR SELECT USING (
        managed_by = auth.uid() OR
        EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
    );

-- managed_members: Family creator can do ALL operations
CREATE POLICY "managed_all" ON public.managed_members
    FOR ALL USING (
        managed_by = auth.uid() OR
        EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
    );

-- family_invites: Family creator can do ALL operations
CREATE POLICY "invites_all" ON public.family_invites
    FOR ALL USING (
        invited_by = auth.uid() OR
        EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
    );

-- family_invites: Anyone can read by token (for acceptance flow)
CREATE POLICY "invites_read_token" ON public.family_invites
    FOR SELECT USING (true);
