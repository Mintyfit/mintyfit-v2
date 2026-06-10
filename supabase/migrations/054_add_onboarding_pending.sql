ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_pending BOOLEAN DEFAULT false;

-- Set onboarding_pending for any user who has user_metadata.onboarding_pending
-- (handles users who signed up before this migration)
UPDATE public.profiles
SET onboarding_pending = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE raw_user_meta_data->>'onboarding_pending' = 'true'
);
