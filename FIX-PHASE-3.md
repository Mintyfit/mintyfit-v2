# Phase 3 — Fix Shopping List & Menus Apply

You are fixing the shopping list and menu-apply features in a Next.js 15 App Router project at `D:\WORKS\Minty\NewMintyAprill2026\AprillBuild`.

**Prerequisites:** Phase 1 must be complete (all `await createClient()` fixes applied).

## Context

The shopping list API route and the menus apply route have bugs beyond the missing `await` that was fixed in Phase 1. These relate to querying wrong column names and mismatched recipe data structures.

### Database Schema Reference

**`calendar_entries`:** column is `date_str` (TEXT), NOT `date`

**`recipes`:** ingredients are stored in the `instructions` column (JSONB) as:
```json
{
  "main_component": "...",
  "side_component": "...",
  "intro": "...",
  "steps": [
    {
      "title": "...",
      "instructions": "...",
      "ingredients": [
        { "name": "Chicken breast", "amount": "300", "unit": "g" },
        ...
      ]
    },
    ...
  ],
  "plating": "..."
}
```

There is NO top-level `ingredients` column on the `recipes` table. Ingredients live INSIDE `instructions.steps[].ingredients`.

There is also NO `name` column on recipes — the column is `title`.

---

## Task 3.1 — Fix `refresh_from_plan` in `app/api/shopping-list/route.js`

In the POST handler, find the `refresh_from_plan` section.

### Fix 1: Query uses wrong column name

Find:
```js
const { data: entries } = await supabase
  .from('calendar_entries')
  .select('recipe_id')
  .eq('profile_id', user.id)
  .in('date', weekDates)
```

Replace `'date'` with `'date_str'`:
```js
const { data: entries } = await supabase
  .from('calendar_entries')
  .select('recipe_id')
  .eq('profile_id', user.id)
  .in('date_str', weekDates)
```

### Fix 2: Recipe select uses wrong columns

Find:
```js
const { data: recipes } = await supabase
  .from('recipes')
  .select('id, name, ingredients, steps')
  .in('id', recipeIds)
```

Recipes don't have `name`, `ingredients`, or `steps` columns. The actual columns are `title` and `instructions` (JSONB containing steps with ingredients). Replace with:
```js
const { data: recipes } = await supabase
  .from('recipes')
  .select('id, title, instructions')
  .in('id', recipeIds)
```

---

## Task 3.2 — Fix `extractIngredientsFromRecipe` in `lib/shopping/utils.js`

This function expects `recipe.ingredients` and `recipe.steps` — but the actual recipe schema stores everything in `recipe.instructions`.

Replace the `extractIngredientsFromRecipe` function:

```js
/**
 * Given a recipe object (with `instructions` JSONB), return a flat list of shopping items.
 * Instructions format: { steps: [{ ingredients: [{ name, amount, unit }] }] }
 * Also handles legacy format where instructions is a plain array of step objects.
 */
export function extractIngredientsFromRecipe(recipe) {
  if (!recipe) return []
  const items = []
  
  const instr = recipe.instructions
  if (!instr) return items
  
  // Get steps array — could be instr.steps or instr itself if legacy array
  const steps = Array.isArray(instr) ? instr : (instr.steps || [])
  
  for (const step of steps) {
    for (const ing of step.ingredients || []) {
      if (!ing?.name) continue
      items.push({
        ingredient_name: ing.name,
        amount: parseFloat(ing.amount) || null,
        unit: ing.unit || null,
        category: categorizeIngredient(ing.name),
        source_recipe_id: recipe.id || null,
      })
    }
  }
  
  return items
}
```

---

## Task 3.3 — Fix `app/api/menus/apply/route.js`

Read this file and check for these issues:

1. **`await createClient()`** — should already be fixed from Phase 1, but verify
2. **Calendar entry inserts** — must use `date_str` not `date`
3. **Recipe data** — when copying menu recipes into calendar_entries, must store `recipe_name` (from recipe title)

Read the file and fix any instances of:
- `date:` in calendar_entries inserts → change to `date_str:`
- Missing `recipe_name` field in inserts
- Any query using `date` column on calendar_entries

The insert for each calendar entry should look like:
```js
{
  profile_id: userId,
  date_str: dateString,   // 'YYYY-MM-DD' format
  meal_type: mealType,
  recipe_id: recipeId,
  recipe_name: recipeName || '',
}
```

---

## Task 3.4 — Fix the shopping list generation from planner button

In `components/planner/PlannerClient.jsx`, the shopping list button collects recipe IDs and POSTs them one by one:

```js
for (const recipe_id of recipeIds) {
  await fetch('/api/shopping-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_id }),
  }).catch(() => {})
}
```

This works but is inefficient — it makes N API calls. However, it's functionally correct now that the API route is fixed, so leave it as-is for now.

BUT: verify that `entry.recipe_id` is accessible correctly. After Phase 2 fixes, entries are structured as:
```js
entries = {
  '2026-04-07': {
    breakfast: [{ id, recipe_id, recipe_name, ... }],
    lunch: [...],
    ...
  }
}
```

The existing loop in the shopping list button iterates:
```js
for (const dayEntries of Object.values(entries)) {
  for (const mealEntries of Object.values(dayEntries)) {
    for (const entry of mealEntries || []) {
      if (entry.recipe_id) recipeIds.add(entry.recipe_id)
    }
  }
}
```

This should work correctly with the Phase 2 data structure. No changes needed here.

---

## Verification

After all fixes, run:
```
cd D:\WORKS\Minty\NewMintyAprill2026\AprillBuild
npx next build
```

Build must succeed.

Then with dev server running:
1. Go to `/shopping-list` — page should load without errors
2. Try adding a manual item — it should appear
3. Try checking/unchecking an item — should toggle
4. Go to `/plan`, add some recipes to a day, then click "🛒 Shopping list" — should navigate to shopping list with items generated from the planned recipes
5. Go to `/menus` — page should load and show menus
6. Go to a menu detail page — should load correctly
7. "Use this plan" button should copy recipes into the planner
