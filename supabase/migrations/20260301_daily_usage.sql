-- daily_usage: tracks per-user per-day feature usage for free-tier limits
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date                  DATE        NOT NULL,
  recipe_generations    INTEGER     NOT NULL DEFAULT 0,
  food_journal_entries  INTEGER     NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily usage"
  ON public.daily_usage
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
