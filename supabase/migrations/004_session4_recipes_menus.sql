-- Session 4: Recipes, Menus, and Menu-Recipes tables
-- Apply via Supabase SQL Editor > New Query

-- ── recipes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title              text        NOT NULL,
  description        text,
  meal_type          text,
  food_type          text,
  cuisine_type       text,
  price_level        text,
  allergens          text[]      NOT NULL DEFAULT '{}',
  glycemic_load      text,
  cooking_technique  text,
  calorie_range      text,
  servings           integer,
  prep_time_minutes  integer,
  cook_time_minutes  integer,
  instructions       jsonb,
  nutrition          jsonb,
  image_url          text,
  is_public          boolean     NOT NULL DEFAULT false,
  search_vector      tsvector,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipes_profile_id_idx ON recipes (profile_id);
CREATE INDEX IF NOT EXISTS recipes_is_public_idx  ON recipes (is_public);
CREATE INDEX IF NOT EXISTS recipes_search_idx     ON recipes USING gin(search_vector);

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION recipes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '')        || ' ' ||
    coalesce(NEW.description, '')  || ' ' ||
    coalesce(NEW.cuisine_type, '') || ' ' ||
    coalesce(NEW.meal_type, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipes_search_vector_trigger ON recipes;
CREATE TRIGGER recipes_search_vector_trigger
  BEFORE INSERT OR UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION recipes_search_vector_update();

-- RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_select_own_or_public"
  ON recipes FOR SELECT
  USING (profile_id = auth.uid() OR is_public = true);

CREATE POLICY "recipes_select_nutritionist"
  ON recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = recipes.profile_id
        AND status = 'active'
    )
  );

CREATE POLICY "recipes_insert_own"
  ON recipes FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "recipes_update_own"
  ON recipes FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "recipes_update_superadmin"
  ON recipes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "recipes_delete_own"
  ON recipes FOR DELETE
  USING (profile_id = auth.uid());

-- ── menus ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menus (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  is_public   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menus_profile_id_idx ON menus (profile_id);

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menus_select_own_or_public"
  ON menus FOR SELECT
  USING (profile_id = auth.uid() OR is_public = true);

CREATE POLICY "menus_select_nutritionist"
  ON menus FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = menus.profile_id
        AND status = 'active'
    )
  );

CREATE POLICY "menus_insert_own"
  ON menus FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "menus_update_own"
  ON menus FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "menus_update_superadmin"
  ON menus FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "menus_delete_own"
  ON menus FOR DELETE
  USING (profile_id = auth.uid());

-- ── menu_recipes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_recipes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id    uuid        NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  recipe_id  uuid        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  meal_type  text,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_recipes_menu_id_idx ON menu_recipes (menu_id);

ALTER TABLE menu_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_recipes_select_own_or_public"
  ON menu_recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_recipes.menu_id
        AND (menus.profile_id = auth.uid() OR menus.is_public = true)
    )
  );

CREATE POLICY "menu_recipes_select_nutritionist"
  ON menu_recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menus
      JOIN nutritionist_client_links ncl ON ncl.client_id = menus.profile_id
      WHERE menus.id = menu_recipes.menu_id
        AND ncl.nutritionist_id = auth.uid()
        AND ncl.status = 'active'
    )
  );

CREATE POLICY "menu_recipes_manage_own"
  ON menu_recipes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_recipes.menu_id
        AND menus.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_recipes.menu_id
        AND menus.profile_id = auth.uid()
    )
  );
