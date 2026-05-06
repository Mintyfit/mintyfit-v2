-- Shared ingredient nutrition database.
-- Stores per-100g nutrition for individual food items.
-- No profile_id — this is reference data, not user content.

CREATE TABLE IF NOT EXISTS ingredients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  name_normalized text NOT NULL,  -- lowercase, trimmed, for dedup matching
  category        text,           -- food group label from classifyFoodGroup()
  nutrition_per_100g  jsonb,      -- full 55-key nutrition object (same keys as NUTRITION_FIELDS)
  common_units    jsonb,          -- e.g. [{"unit":"piece","grams":50},{"unit":"clove","grams":5}]
  usda_fdc_id     integer,        -- USDA FoodData Central ID if sourced from USDA
  source          text NOT NULL DEFAULT 'usda',  -- 'usda' | 'openfoodfacts' | 'ai' | 'manual'
  verified        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ingredients_name_normalized_idx ON ingredients (name_normalized);
CREATE INDEX IF NOT EXISTS ingredients_category_idx ON ingredients (category);

-- RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "ingredients_select" ON ingredients FOR SELECT USING (true);

-- Any authenticated user can insert (lookups auto-populate the table)
CREATE POLICY "ingredients_insert" ON ingredients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only superadmins can update (curation)
CREATE POLICY "ingredients_update" ON ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Only superadmins can delete
CREATE POLICY "ingredients_delete" ON ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Link forked recipes back to their originals
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS forked_from_id uuid REFERENCES recipes(id) ON DELETE SET NULL;
