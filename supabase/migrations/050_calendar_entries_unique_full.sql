-- Fix mig 049: PostgREST upsert can't target a partial unique index.
-- The two partial indexes from 049 are valid as integrity constraints but
-- can't be used in `INSERT ... ON CONFLICT (cols)` via PostgREST, which
-- breaks the Plan page's drag-and-drop add (error 42P10).
--
-- Replace them with one non-partial unique on (family_id, date, meal,
-- recipe, origin). PostgreSQL's default NULLS DISTINCT semantics mean
-- rows with family_id IS NULL (legacy / solo users) don't collide with
-- each other through this index — acceptable, because solo users have
-- only one writer (themselves) and the UI doesn't create dupes intentionally.

DROP INDEX IF EXISTS public.calendar_entries_family_slot_unique;
DROP INDEX IF EXISTS public.calendar_entries_profile_slot_unique;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_entries_family_slot_unique
  ON public.calendar_entries (family_id, date_str, meal_type, recipe_id, origin);
