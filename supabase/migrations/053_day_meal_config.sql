-- Per-day meal type toggles so each day can have its own set of enabled meals
-- (e.g., 3 meals Mon-Fri, 2 meals on weekends, snacks only on some days).
-- Affects nutrition calculations: daily targets divided by enabled meal count.

CREATE TABLE day_meal_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  date_str date NOT NULL,
  enabled_meal_types text[] DEFAULT '{breakfast,snack,lunch,snack2,dinner}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(family_id, date_str)
);

ALTER TABLE day_meal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read meal configs"
  ON day_meal_config FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM family_memberships WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Family members can insert meal configs"
  ON day_meal_config FOR INSERT
  WITH CHECK (family_id IN (
    SELECT family_id FROM family_memberships WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Family members can update meal configs"
  ON day_meal_config FOR UPDATE
  USING (family_id IN (
    SELECT family_id FROM family_memberships WHERE profile_id = auth.uid()
  ));
