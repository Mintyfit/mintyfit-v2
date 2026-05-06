-- Cooking variants for the ingredients table.
-- Stores per-100g nutrition for each cooked form of an ingredient.
-- Separate table because one ingredient can have many cooking methods,
-- and many ingredients (herbs, oils, spices) have no cooked variant at all.

CREATE TABLE IF NOT EXISTS ingredient_cooking_variants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id       uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  cooking_method      text NOT NULL,   -- 'boiled','steamed','fried','baked','roasted','grilled','sautéed','stir-fried','raw'
  nutrition_per_100g  jsonb NOT NULL,  -- full 55-key nutrition object for this cooked form
  usda_fdc_id         integer,         -- USDA FoodData Central ID for this specific cooked entry
  source              text NOT NULL DEFAULT 'usda',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cooking_variants_ingredient_method_idx
  ON ingredient_cooking_variants (ingredient_id, cooking_method);

CREATE INDEX IF NOT EXISTS cooking_variants_ingredient_idx
  ON ingredient_cooking_variants (ingredient_id);

ALTER TABLE ingredient_cooking_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cooking_variants_select" ON ingredient_cooking_variants FOR SELECT USING (true);
CREATE POLICY "cooking_variants_insert" ON ingredient_cooking_variants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cooking_variants_update" ON ingredient_cooking_variants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "cooking_variants_delete" ON ingredient_cooking_variants FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
