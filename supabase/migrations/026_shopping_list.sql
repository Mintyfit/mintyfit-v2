-- Session 06: Shopping List tables

-- Shopping list (one per user / per family)
CREATE TABLE IF NOT EXISTS shopping_lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL DEFAULT 'Shopping List',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Items within a shopping list
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id           uuid    NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name   text    NOT NULL,
  amount            numeric,
  unit              text,
  category          text    NOT NULL DEFAULT 'other',
  checked           boolean NOT NULL DEFAULT false,
  source_recipe_id  uuid    REFERENCES recipes(id) ON DELETE SET NULL,
  added_by          uuid    REFERENCES auth.users ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS shopping_lists_owner_idx ON shopping_lists(owner_id);
CREATE INDEX IF NOT EXISTS shopping_list_items_list_idx ON shopping_list_items(list_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_shopping_list_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE shopping_lists SET updated_at = now() WHERE id = NEW.list_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shopping_list_items_updated
  AFTER INSERT OR UPDATE OR DELETE ON shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION update_shopping_list_updated_at();

-- RLS
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- shopping_lists: owner can do anything
CREATE POLICY "owners_all_shopping_lists"
  ON shopping_lists FOR ALL
  USING (owner_id = auth.uid());

-- shopping_list_items: owner of list can do anything
CREATE POLICY "owners_all_shopping_list_items"
  ON shopping_list_items FOR ALL
  USING (
    list_id IN (SELECT id FROM shopping_lists WHERE owner_id = auth.uid())
  );
