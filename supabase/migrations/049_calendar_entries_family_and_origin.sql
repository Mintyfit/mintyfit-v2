-- Per-member meal variants + independent logging
--
-- Goal: support two new Plan behaviours without new tables:
--   1. Different recipes for different family members in the same meal slot
--      (e.g. dad has eggs, kids have oatmeal at Tuesday breakfast).
--   2. A member logging a meal they ate independently of the family plan
--      (e.g. dad's solo breakfast). Same shape, different intent.
--
-- Strategy: extend calendar_entries with family scope + origin marker.
-- Multiple rows per (date, meal) already legal; consumer_member_ids (mig 048)
-- already tracks who is eating each row. This migration finishes the model.

-- ─── 1. family_id: scope entries to a family, not just one profile ────────────
-- Nullable so legacy rows keep working. New writes set it from the author's
-- active family. Stats/Plan read paths can fall back to profile_id for nulls.

ALTER TABLE public.calendar_entries
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS calendar_entries_family_date_idx
  ON public.calendar_entries (family_id, date_str);

-- Backfill: for each entry, pick the author's first family membership.
-- Safe because every existing entry was authored by a single profile.
-- Drop the unique index first in case it already exists from a prior partial run
DROP INDEX IF EXISTS public.calendar_entries_family_slot_unique;
DROP INDEX IF EXISTS public.calendar_entries_profile_slot_unique;
UPDATE public.calendar_entries ce
SET family_id = fm.family_id
FROM public.family_memberships fm
WHERE fm.profile_id = ce.profile_id
  AND ce.family_id IS NULL;

-- ─── 2. origin: distinguish planned-ahead from logged-after-the-fact ─────────
-- 'planned' = placed on the calendar via Plan UI (the shared family meal).
-- 'logged'  = recorded by a member as "I ate this" — visible in Stats/Journal
--             but rendered as a side badge on the Plan view, not the headline.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_entry_origin') THEN
    CREATE TYPE calendar_entry_origin AS ENUM ('planned', 'logged');
  END IF;
END$$;

ALTER TABLE public.calendar_entries
  ADD COLUMN IF NOT EXISTS origin calendar_entry_origin NOT NULL DEFAULT 'planned';

CREATE INDEX IF NOT EXISTS calendar_entries_origin_idx
  ON public.calendar_entries (family_id, date_str, origin);

-- ─── 2b. Dedupe pre-existing rows that collapse under the new uniqueness ────
-- Before mig 049 each profile owned its own rows, so two co-admins in the
-- same family could each have an entry for the same recipe in the same slot.
-- After backfilling family_id those rows now share a key. Merge them:
--   - keep the earliest row per (family_id, date, meal, recipe, origin)
--   - union consumer_member_ids from the dropped siblings into the keeper
--   - delete the siblings

WITH ranked AS (
  SELECT id,
         family_id, date_str, meal_type, recipe_id, origin,
         consumer_member_ids,
         ROW_NUMBER() OVER (
           PARTITION BY family_id, date_str, meal_type, recipe_id, origin
           ORDER BY created_at, id
         ) AS rn
  FROM public.calendar_entries
  WHERE family_id IS NOT NULL
),
merged AS (
  SELECT r.family_id, r.date_str, r.meal_type, r.recipe_id, r.origin,
         (SELECT id FROM ranked
            WHERE family_id = r.family_id AND date_str = r.date_str
              AND meal_type = r.meal_type AND recipe_id = r.recipe_id
              AND origin = r.origin AND rn = 1) AS keeper_id,
         ARRAY(
           SELECT DISTINCT unnest(coalesce(consumer_member_ids, ARRAY[]::uuid[]))
           FROM ranked
           WHERE family_id = r.family_id AND date_str = r.date_str
             AND meal_type = r.meal_type AND recipe_id = r.recipe_id
             AND origin = r.origin
         ) AS merged_consumers
  FROM ranked r
  GROUP BY r.family_id, r.date_str, r.meal_type, r.recipe_id, r.origin
)
UPDATE public.calendar_entries ce
SET consumer_member_ids = m.merged_consumers
FROM merged m
WHERE ce.id = m.keeper_id;

DELETE FROM public.calendar_entries ce
USING (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY family_id, date_str, meal_type, recipe_id, origin
             ORDER BY created_at, id
           ) AS rn
    FROM public.calendar_entries
    WHERE family_id IS NOT NULL
  ) s
  WHERE s.rn > 1
) dupes
WHERE ce.id = dupes.id;

-- ─── 3. Uniqueness: allow planned + logged of the same recipe in same slot ───
-- Old constraint:  UNIQUE (profile_id, date_str, meal_type, recipe_id)
-- New constraint:  UNIQUE (family_id, date_str, meal_type, recipe_id, origin)
-- Rationale: family-scoped (so two co-admins don't create duplicates), and
-- origin-aware (so "planned eggs" and a member's "logged eggs" coexist).
-- Keep a fallback unique on profile_id for rows where family_id is still NULL
-- (legacy / solo users without a family).

ALTER TABLE public.calendar_entries
  DROP CONSTRAINT IF EXISTS calendar_entries_profile_id_date_str_meal_type_recipe_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_entries_family_slot_unique
  ON public.calendar_entries (family_id, date_str, meal_type, recipe_id, origin)
  WHERE family_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_entries_profile_slot_unique
  ON public.calendar_entries (profile_id, date_str, meal_type, recipe_id, origin)
  WHERE family_id IS NULL;

-- ─── 4. RLS: family members can read/write the family's calendar ─────────────
-- Existing "Users manage own calendar" stays (covers legacy null-family rows).
-- Add a family-scoped policy so any member of the family sees & edits the plan.

DROP POLICY IF EXISTS "Family members manage family calendar" ON public.calendar_entries;
CREATE POLICY "Family members manage family calendar"
  ON public.calendar_entries FOR ALL
  USING (
    family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = calendar_entries.family_id
        AND fm.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_memberships fm
      WHERE fm.family_id = calendar_entries.family_id
        AND fm.profile_id = auth.uid()
    )
  );
