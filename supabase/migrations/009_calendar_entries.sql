-- Calendar entries: recipe slots in the meal planner
-- Each row = one recipe placed in one meal slot on one day for one user

CREATE TABLE IF NOT EXISTS public.calendar_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_str    TEXT        NOT NULL,          -- 'YYYY-MM-DD'
  meal_type   TEXT        NOT NULL,          -- breakfast | snack | lunch | snack2 | dinner
  recipe_id   UUID        NOT NULL,
  recipe_name TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, date_str, meal_type, recipe_id)
);

ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own calendar" ON public.calendar_entries;
CREATE POLICY "Users manage own calendar"
  ON public.calendar_entries FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Nutritionists can read their clients' calendar entries
DROP POLICY IF EXISTS "Nutritionists read client calendars" ON public.calendar_entries;
CREATE POLICY "Nutritionists read client calendars"
  ON public.calendar_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = calendar_entries.profile_id
        AND status = 'active'
    )
  );
