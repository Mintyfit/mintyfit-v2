-- ============================================================================
-- FIX: Allow invite acceptance (update own invite status)
-- ============================================================================
-- The accept-invite route needs to UPDATE the invite status
-- This policy allows the invite recipient to update their invite
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "invites_all" ON public.family_invites;
DROP POLICY IF EXISTS "invites_read_token" ON public.family_invites;
DROP POLICY IF EXISTS "Family creator manages invites" ON public.family_invites;
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.family_invites;
DROP POLICY IF EXISTS "invites_admin_all" ON public.family_invites;
DROP POLICY IF EXISTS "invites_select" ON public.family_invites;
DROP POLICY IF EXISTS "invites_accept" ON public.family_invites;

-- Family creator can do ALL operations on invites
CREATE POLICY "invites_admin_all" ON public.family_invites
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM families 
            WHERE id = family_id AND created_by = auth.uid()
        )
    );

-- Anyone can SELECT invites (needed for invite page to load)
CREATE POLICY "invites_select" ON public.family_invites
    FOR SELECT USING (true);

-- Anyone can UPDATE their own invite (needed for acceptance)
-- This allows the invitee to change status from 'pending' to 'accepted'
CREATE POLICY "invites_accept" ON public.family_invites
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
