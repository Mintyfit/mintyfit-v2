-- Add consumer_member_ids to calendar_entries.
-- One row per (day, meal, recipe). The array tracks which family members
-- actually ate this entry. Defaults to empty array; the planner UI seeds it
-- with currently-checked members on insert.

ALTER TABLE calendar_entries
  ADD COLUMN IF NOT EXISTS consumer_member_ids uuid[] DEFAULT ARRAY[]::uuid[];

-- Backfill: for legacy per-member rows, seed with [member_id] so the new
-- read path treats them the same as freshly-inserted single rows.
UPDATE calendar_entries
SET consumer_member_ids = ARRAY[member_id]::uuid[]
WHERE member_id IS NOT NULL
  AND (consumer_member_ids IS NULL OR cardinality(consumer_member_ids) = 0);

-- Index for the GIN-style "member is in consumers" lookups statistics will use.
CREATE INDEX IF NOT EXISTS calendar_entries_consumer_member_ids_idx
  ON calendar_entries USING GIN (consumer_member_ids);
