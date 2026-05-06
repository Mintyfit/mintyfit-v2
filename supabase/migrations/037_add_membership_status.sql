-- ============================================================================
-- ADD status COLUMN TO family_memberships
-- ============================================================================
-- The invite acceptance flow and other code expects a status column
-- This adds it to track active/inactive memberships
-- ============================================================================

-- Add status column to family_memberships
ALTER TABLE public.family_memberships
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending'));

-- Set existing records to active
UPDATE public.family_memberships SET status = 'active' WHERE status IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_family_memberships_status ON public.family_memberships(status);

-- Also fix the accept-invite route which references status
-- The column now exists so the code will work
