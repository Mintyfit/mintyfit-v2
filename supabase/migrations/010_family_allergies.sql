-- Add allergies field to family_members (freeform text, one entry per line)
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS allergies TEXT DEFAULT '';
