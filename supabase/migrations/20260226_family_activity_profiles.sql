-- Add activity_profiles JSONB column to family_members
-- Stores per-member saved activity profiles (name, duration, calories)
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS activity_profiles JSONB DEFAULT '[]'::jsonb;
