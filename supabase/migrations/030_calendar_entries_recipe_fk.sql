-- Add the missing foreign key from calendar_entries.recipe_id → recipes.id
--
-- Without this FK, PostgREST cannot resolve the nested embed
--   .select('id, ..., recipes(id, title, slug, ...)')
-- and every read of calendar entries returns
--   PGRST200 "Could not find a relationship between 'calendar_entries' and 'recipes'"
-- which makes saved recipes appear to never save in the planner UI.

-- Step 1: clean up any orphan rows that would block the FK creation.
DELETE FROM public.calendar_entries
WHERE recipe_id IS NOT NULL
  AND recipe_id NOT IN (SELECT id FROM public.recipes);

-- Step 2: add the foreign key (idempotent — drop first if it somehow exists).
ALTER TABLE public.calendar_entries
  DROP CONSTRAINT IF EXISTS calendar_entries_recipe_id_fkey;

ALTER TABLE public.calendar_entries
  ADD CONSTRAINT calendar_entries_recipe_id_fkey
  FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

-- Step 3: tell PostgREST to refresh its schema cache so the embed works
-- without waiting for the next auto-refresh.
NOTIFY pgrst, 'reload schema';
