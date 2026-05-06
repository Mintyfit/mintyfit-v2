-- ============================================================================
-- MintyFit v2 — Complete Database Schema
-- Generated: 2026-05-04
-- For transfer to another Supabase project
-- ============================================================================
-- USAGE: Run this SQL in the Supabase SQL Editor of the TARGET project.
-- All statements use IF NOT EXISTS / IF EXISTS — safe to re-run.
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================================
-- profiles — Supabase Auth creates this table automatically.
-- These ALTERs add all columns that mintyfit expects.
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name             TEXT,
  ADD COLUMN IF NOT EXISTS role                  TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS subscription_tier     TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS status                TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS phone                 TEXT,
  ADD COLUMN IF NOT EXISTS units_preference       TEXT DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS nutritionist_email     TEXT,
  ADD COLUMN IF NOT EXISTS nutritionist_sharing   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_weekly_summary   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_meal_reminders   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_tips             BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_approved            BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active              BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS bio                    TEXT,
  ADD COLUMN IF NOT EXISTS credentials_url        TEXT,
  ADD COLUMN IF NOT EXISTS applied_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avatar_url             TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS marketing_consent      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_confirmed        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gdpr_consent_given     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gdpr_consent_date      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at             TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- subscriptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT DEFAULT 'inactive',
  tier                   TEXT DEFAULT 'free',
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- nutritionist_client_links
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.nutritionist_client_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status           TEXT DEFAULT 'pending',
  accepted_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nutritionist_id, client_id)
);

ALTER TABLE public.nutritionist_client_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Nutritionists read own links" ON public.nutritionist_client_links
  FOR SELECT USING (auth.uid() = nutritionist_id);
CREATE POLICY IF NOT EXISTS "Nutritionists manage own links" ON public.nutritionist_client_links
  FOR ALL USING (auth.uid() = nutritionist_id);

-- ============================================================================
-- nutritionist_notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.nutritionist_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content          TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.nutritionist_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Nutritionists manage own notes" ON public.nutritionist_notes
  FOR ALL USING (auth.uid() = nutritionist_id);

-- ============================================================================
-- nutritionist_invites
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.nutritionist_invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  token            UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending',
  message          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  accepted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_nutritionist_invites_token ON public.nutritionist_invites(token);
CREATE INDEX IF NOT EXISTS idx_nutritionist_invites_email ON public.nutritionist_invites(email);
CREATE INDEX IF NOT EXISTS idx_nutritionist_invites_nut   ON public.nutritionist_invites(nutritionist_id);

ALTER TABLE public.nutritionist_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Nutritionists manage own invites" ON public.nutritionist_invites
  FOR ALL USING (auth.uid() = nutritionist_id) WITH CHECK (auth.uid() = nutritionist_id);

-- ============================================================================
-- audit_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email  TEXT,
  action       TEXT NOT NULL,
  target_id    UUID,
  target_type  TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Super admins read audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
CREATE POLICY IF NOT EXISTS "Service role insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- gdpr_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email    TEXT,
  request_type  TEXT DEFAULT 'export',
  status        TEXT DEFAULT 'pending',
  requested_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users read own gdpr requests" ON public.gdpr_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users insert own gdpr requests" ON public.gdpr_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Super admins manage gdpr requests" ON public.gdpr_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- recipes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipes (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  description        TEXT,
  meal_type          TEXT,
  food_type          TEXT,
  cuisine_type       TEXT,
  price_level        TEXT,
  allergens          TEXT[]      NOT NULL DEFAULT '{}',
  glycemic_load      TEXT,
  cooking_technique  TEXT,
  calorie_range      TEXT,
  servings           INTEGER,
  prep_time_minutes  INTEGER,
  cook_time_minutes  INTEGER,
  instructions       JSONB,
  nutrition          JSONB,
  image_url          TEXT,
  image_thumb_url    TEXT,
  is_public          BOOLEAN     NOT NULL DEFAULT false,
  search_vector      tsvector,
  slug               TEXT UNIQUE,
  forked_from_id     UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipes_profile_id_idx ON recipes (profile_id);
CREATE INDEX IF NOT EXISTS recipes_is_public_idx  ON recipes (is_public);
CREATE INDEX IF NOT EXISTS recipes_search_idx     ON recipes USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_recipes_slug       ON recipes(slug);

-- search_vector trigger
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

-- slug generation function
CREATE OR REPLACE FUNCTION generate_slug(title text, id uuid)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        unaccent(title),
      '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g')
  ) || '-' || substr(id::text, 1, 6);
END;
$$ LANGUAGE plpgsql;

-- recipe slug trigger
CREATE OR REPLACE FUNCTION set_recipe_slug()
RETURNS trigger AS $$
BEGIN
  IF new.slug IS NULL THEN
    new.slug := generate_slug(new.title, new.id);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipe_slug_trigger ON recipes;
CREATE TRIGGER recipe_slug_trigger
BEFORE INSERT ON recipes
FOR EACH ROW EXECUTE FUNCTION set_recipe_slug();

-- RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public recipes visible to all"
  ON recipes FOR SELECT TO public
  USING (is_public = true);

CREATE POLICY IF NOT EXISTS "recipes_select_own_or_public"
  ON recipes FOR SELECT
  USING (profile_id = auth.uid() OR is_public = true);

CREATE POLICY IF NOT EXISTS "recipes_select_nutritionist"
  ON recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = recipes.profile_id
        AND status = 'active'
    )
  );

CREATE POLICY IF NOT EXISTS "recipes_insert_own"
  ON recipes FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY IF NOT EXISTS "recipes_update_own"
  ON recipes FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY IF NOT EXISTS "recipes_update_superadmin"
  ON recipes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY IF NOT EXISTS "recipes_delete_own"
  ON recipes FOR DELETE
  USING (profile_id = auth.uid());

-- ============================================================================
-- menus
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menus (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  is_public       BOOLEAN     NOT NULL DEFAULT false,
  image_url       TEXT,
  image_thumb_url TEXT,
  slug            TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menus_profile_id_idx ON menus (profile_id);

-- menu slug trigger
CREATE OR REPLACE FUNCTION set_menu_slug()
RETURNS trigger AS $$
BEGIN
  IF new.slug IS NULL THEN
    new.slug := generate_slug(new.name, new.id);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS menu_slug_trigger ON menus;
CREATE TRIGGER menu_slug_trigger
BEFORE INSERT ON menus
FOR EACH ROW EXECUTE FUNCTION set_menu_slug();

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "menus_select_own_or_public"
  ON menus FOR SELECT
  USING (profile_id = auth.uid() OR is_public = true);

CREATE POLICY IF NOT EXISTS "menus_select_nutritionist"
  ON menus FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = menus.profile_id
        AND status = 'active'
    )
  );

CREATE POLICY IF NOT EXISTS "menus_insert_own"
  ON menus FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY IF NOT EXISTS "menus_update_own"
  ON menus FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY IF NOT EXISTS "menus_update_superadmin"
  ON menus FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY IF NOT EXISTS "menus_delete_own"
  ON menus FOR DELETE
  USING (profile_id = auth.uid());

-- ============================================================================
-- menu_recipes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_recipes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id    UUID        NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  recipe_id  UUID        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  meal_type  TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_recipes_menu_id_idx ON menu_recipes (menu_id);

ALTER TABLE menu_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "menu_recipes_select_own_or_public"
  ON menu_recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = menu_recipes.menu_id
        AND (menus.profile_id = auth.uid() OR menus.is_public = true)
    )
  );

CREATE POLICY IF NOT EXISTS "menu_recipes_select_nutritionist"
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

CREATE POLICY IF NOT EXISTS "menu_recipes_manage_own"
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

-- ============================================================================
-- calendar_entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.calendar_entries (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_str           TEXT        NOT NULL,
  meal_type          TEXT        NOT NULL,
  recipe_id          UUID        NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  recipe_name        TEXT        NOT NULL DEFAULT '',
  member_id          TEXT,
  personal_nutrition JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT calendar_entries_unique UNIQUE NULLS NOT DISTINCT (profile_id, date_str, meal_type, recipe_id, member_id)
);

ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own calendar"
  ON public.calendar_entries FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Nutritionists read client calendars"
  ON public.calendar_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = calendar_entries.profile_id
        AND status = 'active'
    )
  );

-- ============================================================================
-- food_journal
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.food_journal (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_date  DATE        NOT NULL,
  meal_type    TEXT        NOT NULL,
  food_name    TEXT        NOT NULL,
  amount       NUMERIC,
  unit         TEXT,
  nutrition    JSONB,
  member_id    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_journal_profile_date_idx ON food_journal (profile_id, logged_date);

ALTER TABLE food_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "journal_select_own"
  ON food_journal FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY IF NOT EXISTS "journal_select_nutritionist"
  ON food_journal FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = food_journal.profile_id
        AND status = 'active'
    )
  );

CREATE POLICY IF NOT EXISTS "journal_insert_own"
  ON food_journal FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY IF NOT EXISTS "journal_delete_own"
  ON food_journal FOR DELETE
  USING (profile_id = auth.uid());

-- ============================================================================
-- daily_usage
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date                  DATE    NOT NULL,
  recipe_generations    INTEGER NOT NULL DEFAULT 0,
  food_journal_entries  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own daily usage"
  ON public.daily_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- daily_activities
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_activities (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_str      TEXT    NOT NULL,
  member_id     TEXT    NOT NULL,
  activity_text TEXT    NOT NULL DEFAULT '',
  time_minutes  NUMERIC NOT NULL DEFAULT 0,
  calories      NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, date_str, member_id)
);

ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own daily activities"
  ON public.daily_activities FOR ALL
  USING  (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Nutritionists read client activities"
  ON public.daily_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = daily_activities.profile_id
        AND status = 'active'
    )
  );

-- ============================================================================
-- recipe_interactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipe_interactions (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id   UUID        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recipe_id    UUID        NOT NULL,
  rating       INT         CHECK (rating >= 1 AND rating <= 5),
  is_favourite BOOLEAN     DEFAULT false NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT   recipe_interactions_unique UNIQUE (profile_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS recipe_interactions_profile_idx ON recipe_interactions (profile_id);

ALTER TABLE recipe_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own recipe interactions"
  ON recipe_interactions FOR ALL
  USING  (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- ============================================================================
-- recipe_member_states
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipe_member_states (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date_str    TEXT NOT NULL,
  meal_type   TEXT NOT NULL,
  recipe_id   UUID NOT NULL,
  member_id   UUID NOT NULL,
  is_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT  recipe_member_states_unique UNIQUE (profile_id, date_str, meal_type, recipe_id, member_id)
);

CREATE INDEX IF NOT EXISTS recipe_member_states_profile_date
  ON recipe_member_states (profile_id, date_str);

ALTER TABLE recipe_member_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own member states"
  ON recipe_member_states FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- ============================================================================
-- ingredients
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ingredients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  name_normalized   TEXT NOT NULL,
  category          TEXT,
  nutrition_per_100g JSONB,
  common_units      JSONB,
  usda_fdc_id       INTEGER,
  source            TEXT NOT NULL DEFAULT 'usda',
  verified          BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ingredients_name_normalized_idx ON ingredients (name_normalized);
CREATE INDEX IF NOT EXISTS ingredients_category_idx ON ingredients (category);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "ingredients_select" ON ingredients FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "ingredients_insert" ON ingredients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "ingredients_update" ON ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY IF NOT EXISTS "ingredients_delete" ON ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ============================================================================
-- ingredient_cooking_variants
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ingredient_cooking_variants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id       UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  cooking_method      TEXT NOT NULL,
  nutrition_per_100g  JSONB NOT NULL,
  usda_fdc_id         INTEGER,
  source              TEXT NOT NULL DEFAULT 'usda',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cooking_variants_ingredient_method_idx
  ON ingredient_cooking_variants (ingredient_id, cooking_method);
CREATE INDEX IF NOT EXISTS cooking_variants_ingredient_idx
  ON ingredient_cooking_variants (ingredient_id);

ALTER TABLE ingredient_cooking_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "cooking_variants_select" ON ingredient_cooking_variants FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "cooking_variants_insert" ON ingredient_cooking_variants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "cooking_variants_update" ON ingredient_cooking_variants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY IF NOT EXISTS "cooking_variants_delete" ON ingredient_cooking_variants FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ============================================================================
-- recipe_ingredient_swaps
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipe_ingredient_swaps (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  replacement_name TEXT NOT NULL,
  replacement_note TEXT,
  amount_factor DOUBLE PRECISION DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, recipe_id, original_name)
);

CREATE INDEX IF NOT EXISTS idx_recipe_swaps_user_recipe
  ON recipe_ingredient_swaps(profile_id, recipe_id);

ALTER TABLE recipe_ingredient_swaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage their own swaps"
  ON recipe_ingredient_swaps FOR ALL TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE OR REPLACE FUNCTION update_recipe_ingredient_swaps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recipe_ingredient_swaps_updated_at ON recipe_ingredient_swaps;
CREATE TRIGGER trg_recipe_ingredient_swaps_updated_at
  BEFORE UPDATE ON recipe_ingredient_swaps
  FOR EACH ROW EXECUTE FUNCTION update_recipe_ingredient_swaps_updated_at();

-- ============================================================================
-- shopping_lists
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Shopping List',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shopping_lists_owner_idx ON shopping_lists(owner_id);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "owners_all_shopping_lists"
  ON shopping_lists FOR ALL
  USING (owner_id = auth.uid());

-- ============================================================================
-- shopping_list_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id           UUID    NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name   TEXT    NOT NULL,
  amount            NUMERIC,
  unit              TEXT,
  category          TEXT    NOT NULL DEFAULT 'other',
  checked           BOOLEAN NOT NULL DEFAULT false,
  source_recipe_id  UUID    REFERENCES recipes(id) ON DELETE SET NULL,
  added_by          UUID    REFERENCES auth.users ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shopping_list_items_list_idx ON shopping_list_items(list_id);

ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "owners_all_shopping_list_items"
  ON shopping_list_items FOR ALL
  USING (
    list_id IN (SELECT id FROM shopping_lists WHERE owner_id = auth.uid())
  );

-- shopping list updated_at trigger
CREATE OR REPLACE FUNCTION update_shopping_list_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE shopping_lists SET updated_at = now() WHERE id = NEW.list_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shopping_list_items_updated ON shopping_list_items;
CREATE TRIGGER trg_shopping_list_items_updated
  AFTER INSERT OR UPDATE OR DELETE ON shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION update_shopping_list_updated_at();

-- ============================================================================
-- families
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'My Family',
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- FINAL policies from 20260430_final_fix.sql
CREATE POLICY IF NOT EXISTS "families_insert" ON public.families
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "families_select" ON public.families
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "families_update" ON public.families
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "families_delete" ON public.families
  FOR DELETE USING (created_by = auth.uid());

-- ============================================================================
-- family_memberships
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.family_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'co-admin', 'member')),
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (family_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_family_memberships_family_id ON public.family_memberships(family_id);
CREATE INDEX IF NOT EXISTS idx_family_memberships_profile_id ON public.family_memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_family_memberships_status ON public.family_memberships(status);

ALTER TABLE public.family_memberships ENABLE ROW LEVEL SECURITY;

-- FINAL policies from 20260430_final_fix.sql
CREATE POLICY IF NOT EXISTS "memberships_select" ON public.family_memberships
  FOR SELECT USING (
    profile_id = auth.uid() OR
    EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "memberships_insert" ON public.family_memberships
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "memberships_update" ON public.family_memberships
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "memberships_delete" ON public.family_memberships
  FOR DELETE USING (
    profile_id = auth.uid() OR
    EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
  );

-- ============================================================================
-- managed_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.managed_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id         UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  managed_by        UUID NOT NULL REFERENCES public.profiles(id),
  name              TEXT NOT NULL,
  date_of_birth     DATE,
  gender            TEXT,
  weight            NUMERIC,
  height            NUMERIC,
  allergies         TEXT[] DEFAULT '{}',
  activity_profiles JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_managed_members_family_id ON public.managed_members(family_id);

ALTER TABLE public.managed_members ENABLE ROW LEVEL SECURITY;

-- FINAL policies from 20260430_final_fix.sql
CREATE POLICY IF NOT EXISTS "managed_select" ON public.managed_members
  FOR SELECT USING (
    managed_by = auth.uid() OR
    EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "managed_all" ON public.managed_members
  FOR ALL USING (
    managed_by = auth.uid() OR
    EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
  );

-- ============================================================================
-- family_invites
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.family_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES public.profiles(id),
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ DEFAULT now() + interval '7 days'
);

CREATE INDEX IF NOT EXISTS idx_family_invites_token ON public.family_invites(token);
CREATE INDEX IF NOT EXISTS idx_family_invites_email ON public.family_invites(email);

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- FINAL policies from 20260430_fix_invite_accept.sql
CREATE POLICY IF NOT EXISTS "invites_admin_all" ON public.family_invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "invites_select" ON public.family_invites
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "invites_accept" ON public.family_invites
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================================
-- weight_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight      NUMERIC NOT NULL,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, logged_date)
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_profile_date ON public.weight_logs(profile_id, logged_date DESC);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own weight logs"
  ON public.weight_logs FOR ALL
  USING (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Nutritionist reads client weight logs"
  ON public.weight_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_client_links ncl
      WHERE ncl.nutritionist_id = auth.uid() AND ncl.client_id = profile_id AND ncl.status = 'active'
    )
  );

-- ============================================================================
-- blog_posts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID        REFERENCES public.profiles(id),
  title           TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  excerpt         TEXT        DEFAULT '',
  content         TEXT        DEFAULT '',
  sidebar_html    TEXT        DEFAULT '',
  image_url       TEXT        DEFAULT '',
  status          TEXT        DEFAULT 'published',
  categories      TEXT[]      DEFAULT '{}',
  tags            TEXT[]      DEFAULT '{}',
  is_published    BOOLEAN     NOT NULL DEFAULT false,
  seo_title       TEXT        DEFAULT NULL,
  seo_description TEXT        DEFAULT NULL,
  published_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_seo_title ON blog_posts(seo_title);
CREATE INDEX IF NOT EXISTS idx_blog_posts_seo_description ON blog_posts(seo_description);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public blog posts are viewable by everyone"
  ON blog_posts FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY IF NOT EXISTS "blog_posts_select_admin"
  ON blog_posts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY IF NOT EXISTS "blog_posts_insert_admin"
  ON blog_posts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY IF NOT EXISTS "blog_posts_update_admin"
  ON blog_posts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY IF NOT EXISTS "blog_posts_delete_admin"
  ON blog_posts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- blog_categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  color      TEXT DEFAULT '#22c55e',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);

ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "blog_categories_select_all"
  ON public.blog_categories FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "blog_categories_admin"
  ON public.blog_categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- blog_tags
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "blog_tags_select_all"
  ON public.blog_tags FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "blog_tags_admin"
  ON public.blog_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- blog_post_categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_post_categories (
  post_id      UUID NOT NULL REFERENCES public.blog_posts(id)     ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

ALTER TABLE blog_post_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "blog_post_categories_select_all"
  ON public.blog_post_categories FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "blog_post_categories_admin"
  ON public.blog_post_categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- blog_post_tags
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id  UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES public.blog_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "blog_post_tags_select_all"
  ON public.blog_post_tags FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "blog_post_tags_admin"
  ON public.blog_post_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- blog_settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_settings (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  sidebar_html TEXT    DEFAULT '',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_settings_singleton ON public.blog_settings (id);

INSERT INTO public.blog_settings (id, sidebar_html)
  VALUES (1, '')
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.blog_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "blog_settings_select"
  ON public.blog_settings FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "blog_settings_super_admin"
  ON public.blog_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- pages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  slug         TEXT        NOT NULL UNIQUE,
  content      TEXT        DEFAULT '',
  image_url    TEXT        DEFAULT '',
  is_published BOOLEAN     DEFAULT false,
  author_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_idx ON public.pages (slug);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "pages_select_published"
  ON public.pages FOR SELECT
  USING (is_published = true);

CREATE POLICY IF NOT EXISTS "pages_super_admin"
  ON public.pages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- promotions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.promotions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT         NOT NULL UNIQUE,
  label            TEXT         NOT NULL,
  description      TEXT         NOT NULL DEFAULT '',
  discount_percent INTEGER      NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  active           BOOLEAN      NOT NULL DEFAULT false,
  start_date       DATE,
  end_date         DATE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read active promotions"
  ON public.promotions FOR SELECT
  USING (active = true);

CREATE POLICY IF NOT EXISTS "Superadmin manage promotions"
  ON public.promotions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Seed promotion
INSERT INTO public.promotions (code, label, description, discount_percent, active, start_date, end_date)
VALUES (
  'MARCH30',
  'March Launch Sale',
  'Save 30% — March only!',
  30,
  true,
  '2026-03-01',
  '2026-03-31'
) ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- profiles RLS policies
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Super admins read all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY IF NOT EXISTS "Super admins update all profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- LEGACY TABLES (disabled in production, kept for data reference)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.family_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  gender            TEXT,
  date_of_birth     DATE,
  allergies         TEXT DEFAULT '',
  activity_profiles JSONB DEFAULT '[]'::jsonb,
  is_managed        BOOLEAN DEFAULT false,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.measurements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id  UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  weight_kg         NUMERIC,
  height_cm         NUMERIC,
  is_pregnant       BOOLEAN DEFAULT false,
  is_breastfeeding  BOOLEAN DEFAULT false,
  recorded_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy tables: RLS policies (re-enabled per revert migration)
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.family_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.measurements TO authenticated;

CREATE POLICY IF NOT EXISTS "family_members_select" ON public.family_members
  FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "family_members_insert" ON public.family_members
  FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "family_members_update" ON public.family_members
  FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "family_members_delete" ON public.family_members
  FOR DELETE USING (profile_id = auth.uid());

CREATE POLICY IF NOT EXISTS "measurements_select" ON public.measurements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = family_member_id AND fm.profile_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "measurements_insert" ON public.measurements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = family_member_id AND fm.profile_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "measurements_update" ON public.measurements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = family_member_id AND fm.profile_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "measurements_delete" ON public.measurements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = family_member_id AND fm.profile_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "super_admin_family_members_select" ON public.family_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
CREATE POLICY IF NOT EXISTS "super_admin_measurements_select" ON public.measurements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
