-- Add columns that exist in code but are missing from the live profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS dietary_type  TEXT,
  ADD COLUMN IF NOT EXISTS allergies     TEXT[],
  ADD COLUMN IF NOT EXISTS primary_goal  TEXT;
