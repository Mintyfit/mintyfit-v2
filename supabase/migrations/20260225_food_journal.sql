-- Food journal entries: persisted per-user, per-day, per-meal with full nutrition
CREATE TABLE IF NOT EXISTS food_journal (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date  date        NOT NULL,
  meal_type    text        NOT NULL,
  food_name    text        NOT NULL,
  amount       numeric,
  unit         text,
  nutrition    jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_journal_profile_date_idx ON food_journal (profile_id, logged_date);

ALTER TABLE food_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_select_own"
  ON food_journal FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "journal_select_nutritionist"
  ON food_journal FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = food_journal.profile_id
        AND status = 'active'
    )
  );

CREATE POLICY "journal_insert_own"
  ON food_journal FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "journal_delete_own"
  ON food_journal FOR DELETE
  USING (profile_id = auth.uid());
