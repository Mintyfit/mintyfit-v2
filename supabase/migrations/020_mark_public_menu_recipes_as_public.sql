-- Mark all recipes that belong to public menus as is_public = true
-- This allows the anon RLS policy to return them on the /recipes listing page

UPDATE recipes
SET is_public = true
WHERE id IN (
  SELECT recipe_id
  FROM menu_recipes
  WHERE menu_id IN (
    SELECT id FROM menus WHERE is_public = true
  )
)
AND is_public = false;
