-- Add personal nutrition columns to calendar_entries
-- Each row now represents one member's nutrition for one recipe in one slot
ALTER TABLE public.calendar_entries
  ADD COLUMN IF NOT EXISTS member_id TEXT,
  ADD COLUMN IF NOT EXISTS personal_nutrition JSONB;

-- Drop old unique constraint
ALTER TABLE public.calendar_entries
  DROP CONSTRAINT IF EXISTS calendar_entries_profile_id_date_str_meal_type_recipe_id_key;

-- New unique constraint includes member_id
-- member_id can be NULL for legacy entries (before this migration)
ALTER TABLE public.calendar_entries
  ADD CONSTRAINT calendar_entries_unique
  UNIQUE NULLS NOT DISTINCT (profile_id, date_str, meal_type, recipe_id, member_id);
