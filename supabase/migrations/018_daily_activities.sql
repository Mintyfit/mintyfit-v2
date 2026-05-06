-- daily_activities: stores per-user per-day per-member activity data
CREATE TABLE IF NOT EXISTS public.daily_activities (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_str     TEXT    NOT NULL,
  member_id    TEXT    NOT NULL,
  activity_text TEXT   NOT NULL DEFAULT '',
  time_minutes NUMERIC NOT NULL DEFAULT 0,
  calories     NUMERIC NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, date_str, member_id)
);

ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily activities"
  ON public.daily_activities
  FOR ALL
  USING  (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
