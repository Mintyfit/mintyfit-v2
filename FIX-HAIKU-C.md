# Fix C — Activities Save + Shopping List from Planner + Recipe Steps

Project: D:\WORKS\Minty\NewMintyAprill2026\AprillBuild

---

## Fix C1 — Activities not saving (wrong column name)

Open `components/planner/ActivityForm.jsx`.

Find the insert inside `handleSave()`:
```js
await supabase.from('daily_activities').insert({
  profile_id: userId,
  member_id: memberId || null,
  date: dateKey,          // ← WRONG column name
  activity_type: activityType,
  duration_minutes: parseFloat(duration),
  calories_burned: caloriesBurned ? parseFloat(caloriesBurned) : null,
  logged_at: new Date().toISOString(),
})
```

Change `date: dateKey` to `date_str: dateKey`. Also remove `logged_at` — that column doesn't exist in the schema. Fixed insert:
```js
await supabase.from('daily_activities').insert({
  profile_id: userId,
  member_id: memberId || null,
  date_str: dateKey,
  activity_type: activityType,
  duration_minutes: parseFloat(duration),
  calories_burned: caloriesBurned ? parseFloat(caloriesBurned) : null,
})
```

---

## Fix C2 — Shopping List from Recipe Detail ("Add to Shopping List" fails)

The recipe detail page calls `POST /api/shopping-list` with `{ recipe_id }`. The API then fetches the recipe and calls `extractIngredientsFromRecipe(recipe)`.

Open `app/api/shopping-list/route.js`. Find the section that handles `body.recipe_id`:

```js
const { data: recipe, error: recipeErr } = await supabase
  .from('recipes')
  .select('id, name, ingredients, steps')   // ← WRONG columns
  .eq('id', body.recipe_id)
  .single()
```

Change the select to match the actual recipe schema:
```js
const { data: recipe, error: recipeErr } = await supabase
  .from('recipes')
  .select('id, title, instructions')         // ← correct columns
  .eq('id', body.recipe_id)
  .single()
```

`lib/shopping/utils.js` `extractIngredientsFromRecipe` was already fixed to read from `instructions.steps[].ingredients` in Phase 3. Verify it reads `instructions` not `ingredients`. If it still references `recipe.ingredients` or `recipe.steps`, fix it:

```js
export function extractIngredientsFromRecipe(recipe) {
  if (!recipe) return []
  const items = []
  const instr = recipe.instructions
  if (!instr) return items
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

## Fix C3 — Shopping List from Planner button

In `components/planner/PlannerClient.jsx`, the shopping list button POSTs `{ recipe_id }` for each recipe in the week. This now works if Fix C2 is done (API fetches correct columns).

Also verify the `refresh_from_plan` path in `app/api/shopping-list/route.js`. It fetches recipes with:
```js
.select('id, title, instructions')
```
If it still says `'id, name, ingredients, steps'` there too, fix it the same way.

---

## Fix C4 — Recipe steps: show ingredients under each step

Open `components/recipes/RecipeDetailClient.jsx`.

Currently the Ingredients section groups by `component === 'main'` and `component === 'side'`, which only works for structured recipes. Many recipes just have steps without component labels.

Replace the entire `{/* Ingredients */}` section with a simpler approach that shows a flat deduplicated ingredient list from ALL steps:

```jsx
{/* Ingredients */}
<section style={{ marginBottom: '2rem' }}>
  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '1rem' }}>Ingredients</h2>
  {recipe.intro && (
    <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.25rem', fontStyle: 'italic' }}>
      {recipe.intro}
    </p>
  )}
  {(() => {
    // Collect all ingredients from all steps, deduplicate by name
    const allIngredients = (recipe.steps || []).flatMap(s => s.ingredients || [])
    const seen = new Set()
    const unique = allIngredients.filter(ing => {
      if (!ing?.name || seen.has(ing.name.toLowerCase())) return false
      seen.add(ing.name.toLowerCase())
      return true
    })
    if (unique.length === 0) return <p style={{ color: 'var(--text-4)', fontSize: '0.875rem' }}>No ingredients listed.</p>
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {unique.map((ing, i) => {
          const scaled = scaleAmount(ing.amount)
          return (
            <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem', fontSize: '0.9375rem', color: 'var(--text-2)', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>•</span>
              <span>
                {scaled ? <strong style={{ color: 'var(--text-1)' }}>{scaled}{ing.unit ? ` ${ing.unit}` : ''} </strong> : ''}
                {ing.name}
              </span>
            </li>
          )
        })}
      </ul>
    )
  })()}
</section>
```

Then for the Instructions section, update it to show each step's ingredients inline under the step:

Find the existing Instructions section. In each step's `<div>`, after the `<p>` with `step.instruction`, add:

```jsx
{/* Step ingredients */}
{(step.ingredients || []).length > 0 && (
  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
    {step.ingredients.map((ing, j) => {
      const scaled = scaleAmount(ing.amount)
      return (
        <span key={j} style={{
          padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem',
          background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)',
        }}>
          {scaled ? `${scaled}${ing.unit ? ' ' + ing.unit : ''} ` : ''}{ing.name}
        </span>
      )
    })}
  </div>
)}
```

---

## Verification

Run `npx next build`. Must pass with 0 errors.

Test:
1. Go to a recipe → Add to Shopping List → should succeed (no error state)
2. Log an activity in the planner → should save and appear in the list
3. Go to /plan → 🛒 Shopping list button → navigates to /shopping-list with items
4. Recipe detail → Ingredients shows a list; Instructions show numbered steps each with ingredient chips below
