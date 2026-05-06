# Phase 2 — Fix the Meal Planner

You are fixing the meal planner in a Next.js 15 App Router project at `D:\WORKS\Minty\NewMintyAprill2026\AprillBuild`.

## Context

The planner has a working older version at `D:\WORKS\Minty\BackupApril2026` that you can reference. The new version's planner queries the database with wrong column names and uses Supabase join syntax that doesn't work with the actual schema. Recipes added to the plan never appear.

### Database Schema (actual, from migrations)

**`calendar_entries` table:**
```sql
id          UUID PK
profile_id  UUID NOT NULL (FK → profiles)
date_str    TEXT NOT NULL          -- 'YYYY-MM-DD' format
meal_type   TEXT NOT NULL          -- breakfast | snack | lunch | snack2 | dinner
recipe_id   UUID NOT NULL          -- just a UUID, NOT a FK to recipes table
recipe_name TEXT NOT NULL DEFAULT ''
member_id   TEXT                    -- added later via migration
personal_nutrition JSONB           -- added later via migration
created_at  TIMESTAMPTZ
UNIQUE(profile_id, date_str, meal_type, recipe_id, member_id)
```

Key facts:
- Column is `date_str` (TEXT), NOT `date`
- There is NO `order_index` column
- `recipe_id` is NOT a foreign key — you cannot use Supabase `.select('recipes(...)') ` join syntax
- There is NO `journal_entries` relation on this table

**`food_journal` table (separate):**
```sql
id, profile_id, logged_date, meal_type, food_name, amount, unit, nutrition (JSONB), member_id
```

**`daily_activities` table:**
```sql
id, profile_id, date_str, member_id, activity_text, time_minutes, calories
```

---

## Task 2.1 — Fix PlannerClient.jsx data loading

Open `components/planner/PlannerClient.jsx`.

### Fix the calendar entries query (around line 72)

Current BROKEN code:
```js
supabase
  .from('calendar_entries')
  .select(`
    id, date, meal_type, member_id, order_index,
    recipes(id, title, slug, image_url, nutrition, servings),
    journal_entries(id, food_name, amount, unit, nutrition, member_id)
  `)
  .eq('profile_id', userId)
  .gte('date', startKey)
  .lte('date', endKey)
```

Replace with:
```js
supabase
  .from('calendar_entries')
  .select('id, date_str, meal_type, recipe_id, recipe_name, member_id, personal_nutrition')
  .eq('profile_id', userId)
  .gte('date_str', startKey)
  .lte('date_str', endKey)
```

### Fix the data mapping (right after the query)

Current code maps entries by `entry.date`. Change to `entry.date_str`:
```js
.then(({ data }) => {
  const map = {}
  for (const entry of data || []) {
    if (!map[entry.date_str]) map[entry.date_str] = {}
    if (!map[entry.date_str][entry.meal_type]) map[entry.date_str][entry.meal_type] = []
    map[entry.date_str][entry.meal_type].push(entry)
  }
  setEntries(map)
  setLoading(false)
})
```

### After loading calendar entries, load the actual recipe data

The entries only have `recipe_id` and `recipe_name`. To show images and nutrition, we need to fetch the recipes separately. Add this AFTER the calendar entries load:

```js
.then(({ data }) => {
  const map = {}
  const recipeIds = new Set()
  for (const entry of data || []) {
    if (!map[entry.date_str]) map[entry.date_str] = {}
    if (!map[entry.date_str][entry.meal_type]) map[entry.date_str][entry.meal_type] = []
    map[entry.date_str][entry.meal_type].push(entry)
    if (entry.recipe_id) recipeIds.add(entry.recipe_id)
  }
  setEntries(map)
  
  // Fetch recipe details for display
  if (recipeIds.size > 0) {
    supabase
      .from('recipes')
      .select('id, title, slug, image_url, nutrition, servings')
      .in('id', [...recipeIds])
      .then(({ data: recipes }) => {
        const recipeMap = {}
        for (const r of recipes || []) recipeMap[r.id] = r
        setRecipeCache(recipeMap)
      })
  }
  setLoading(false)
})
```

Add a new state variable at the top of the component:
```js
const [recipeCache, setRecipeCache] = useState({})
```

### Fix the daily_activities query

Current code queries with `.gte('date', ...)`. Change to `.gte('date_str', ...)` and `.lte('date_str', ...)`:
```js
supabase
  .from('daily_activities')
  .select('*')
  .eq('profile_id', userId)
  .gte('date_str', startKey)
  .lte('date_str', endKey)
  .then(({ data }) => {
    const actMap = {}
    for (const act of data || []) {
      if (!actMap[act.date_str]) actMap[act.date_str] = {}
      if (!actMap[act.date_str][act.member_id]) actMap[act.date_str][act.member_id] = []
      actMap[act.date_str][act.member_id].push(act)
    }
    setActivities(actMap)
  })
```

### Fix the refreshDay function

Current code queries `date` column. Change to `date_str`:
```js
const refreshDay = useCallback(async (dateKey) => {
  const supabase = createClient()
  if (!supabase || !userId) return
  const { data } = await supabase
    .from('calendar_entries')
    .select('id, date_str, meal_type, recipe_id, recipe_name, member_id, personal_nutrition')
    .eq('profile_id', userId)
    .eq('date_str', dateKey)
  const mealMap = {}
  const newRecipeIds = new Set()
  for (const entry of data || []) {
    if (!mealMap[entry.meal_type]) mealMap[entry.meal_type] = []
    mealMap[entry.meal_type].push(entry)
    if (entry.recipe_id) newRecipeIds.add(entry.recipe_id)
  }
  setEntries(prev => ({ ...prev, [dateKey]: mealMap }))
  
  // Fetch any new recipe details
  if (newRecipeIds.size > 0) {
    const supabase2 = createClient()
    const { data: recipes } = await supabase2
      .from('recipes')
      .select('id, title, slug, image_url, nutrition, servings')
      .in('id', [...newRecipeIds])
    if (recipes) {
      setRecipeCache(prev => {
        const next = { ...prev }
        for (const r of recipes) next[r.id] = r
        return next
      })
    }
  }
}, [userId])
```

### Fix handleMealSlotPick (insert)

Current code inserts with `date: dateKey` and `order_index`. Fix to match actual schema:
```js
await supabase.from('calendar_entries').insert({
  profile_id: userId,
  date_str: dateKey,
  meal_type: mealType,
  recipe_id: draggedRecipe.current.id,
  recipe_name: draggedRecipe.current.title || '',
})
```

### Fix the shopping list button

Current code iterates entries looking for `entry.recipe_id` but entries are structured as `entries[dateKey][mealType] = [entry, ...]`. The current code tries `Object.values(entries)` which gives `{ breakfast: [...], lunch: [...] }` objects, then `Object.values(dayEntries)` which gives the arrays. This part looks correct structurally, but entries now have `recipe_id` directly on them (not nested), so it should work. Verify the loop:

```js
const recipeIds = new Set()
for (const dayEntries of Object.values(entries)) {
  for (const mealEntries of Object.values(dayEntries)) {
    for (const entry of mealEntries || []) {
      if (entry.recipe_id) recipeIds.add(entry.recipe_id)
    }
  }
}
```

### Pass recipeCache to child components

Pass `recipeCache` as a prop to `WeekOverview` and `DayAgenda`:

In the WeekOverview render:
```jsx
<WeekOverview
  weekDates={weekDates}
  entries={entries}
  activities={activities}
  members={members}
  today={today}
  onSelectDay={selectDay}
  onDropRecipe={handleDropRecipe}
  dragActive={dragActive}
  recipeCache={recipeCache}
/>
```

In the DayAgenda render:
```jsx
<DayAgenda
  date={selectedDate}
  dateKey={dateKey}
  entries={dayEntries}
  activities={dayActivities}
  members={members}
  userId={userId}
  onBack={handleBackToWeek}
  onRefresh={refreshDay}
  onRemoveEntry={removeEntry}
  recipeCache={recipeCache}
/>
```

---

## Task 2.2 — Fix WeekOverview.jsx

Open `components/planner/WeekOverview.jsx`.

Add `recipeCache` to the destructured props:
```js
export default function WeekOverview({ weekDates, entries, activities, members, today, onSelectDay, onDropRecipe, dragActive, recipeCache = {} }) {
```

### Fix getDayCalories

Current code tries `entry.recipes?.nutrition?.perServing?.energy_kcal` — but `entry.recipes` doesn't exist anymore. Entries now have `recipe_id` and optionally `personal_nutrition`. Use the recipeCache:

```js
function getDayCalories(dayEntries, recipeCache) {
  let total = 0
  for (const mealType of MEAL_TYPES) {
    for (const entry of dayEntries[mealType] || []) {
      // Prefer stored personal_nutrition, fall back to recipe cache
      if (entry.personal_nutrition?.energy_kcal) {
        total += entry.personal_nutrition.energy_kcal
      } else {
        const recipe = recipeCache[entry.recipe_id]
        const kcal = recipe?.nutrition?.perServing?.energy_kcal || 0
        total += kcal
      }
    }
  }
  return Math.round(total)
}
```

Update the call: `const totalCal = getDayCalories(dayEntries, recipeCache)`

### Fix memberRatios calculation

Same issue — replace `entry.recipes?.nutrition?.perServing?.energy_kcal` with recipe cache lookup:

```js
const memberRatios = members.slice(0, 3).map(member => {
  const needs = computeMemberDailyNeeds(member)
  const target = needs?.energy_kcal || member.daily_calories_target || 2000
  let consumed = 0
  for (const mealType of MEAL_TYPES) {
    for (const entry of dayEntries[mealType] || []) {
      // Use personal_nutrition if available
      if (entry.personal_nutrition?.energy_kcal && (!entry.member_id || entry.member_id === member.id)) {
        consumed += entry.personal_nutrition.energy_kcal
        continue
      }
      const recipe = recipeCache[entry.recipe_id]
      const kcal = recipe?.nutrition?.perServing?.energy_kcal || 0
      if (!entry.member_id || entry.member_id === member.id) {
        consumed += kcal / Math.max(1, members.length)
      }
    }
  }
  return { member, ratio: target > 0 ? consumed / target : 0 }
})
```

---

## Task 2.3 — Fix DayAgenda.jsx

Open `components/planner/DayAgenda.jsx`.

Add `recipeCache = {}` to the destructured props.

### Fix the member summaries calculation

Replace all `entry.recipes?.nutrition?.perServing?.energy_kcal` patterns. The entries now have `recipe_id` (UUID string) and optionally `personal_nutrition`. Use recipe cache for display data:

```js
for (const mealType of MEAL_TYPES) {
  for (const entry of entries[mealType] || []) {
    if (entry.personal_nutrition?.energy_kcal && (!entry.member_id || entry.member_id === member.id)) {
      consumed += entry.personal_nutrition.energy_kcal
      continue
    }
    const recipe = recipeCache[entry.recipe_id]
    const kcal = recipe?.nutrition?.perServing?.energy_kcal || 0
    if (!entry.member_id || entry.member_id === member.id) {
      consumed += kcal / Math.max(1, members.length)
    }
    // Journal entries (if nested — check if they exist)
    if (entry.journal_entries) {
      for (const je of entry.journal_entries) {
        if (!je.member_id || je.member_id === member.id) {
          consumed += je.nutrition?.energy_kcal || 0
        }
      }
    }
  }
}
```

### Fix the recipe display in meal slots

Current code does `slotEntries.filter(e => e.recipes)` — entries don't have a `.recipes` property. They have `.recipe_id`. Fix:

```js
{slotEntries.filter(e => e.recipe_id).map(entry => {
  const r = recipeCache[entry.recipe_id]
  const slug = r?.slug || entry.recipe_id
  const title = r?.title || entry.recipe_name || 'Recipe'
  const imageUrl = r?.image_url
  const kcal = entry.personal_nutrition?.energy_kcal || r?.nutrition?.perServing?.energy_kcal
  return (
    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
      {imageUrl && (
        <div style={{ width: 44, height: 44, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6', position: 'relative' }}>
          <Image src={imageUrl} alt={title} fill style={{ objectFit: 'cover' }} sizes="44px" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/recipes/${slug}?date=${dateKey}&meal=${mealType}`}
          style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {title}
        </Link>
        {kcal != null && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>🔥 {Math.round(kcal)} kcal</span>
        )}
      </div>
      <button
        onClick={() => handleRemove(entry.id)}
        disabled={removingId === entry.id}
        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-4)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  )
})}
```

### Fix handleAddRecipe

Current insert uses `date: dateKey`. Fix to `date_str`:
```js
async function handleAddRecipe(recipe, mealType) {
  const supabase = createClient()
  if (!supabase) return
  await supabase.from('calendar_entries').insert({
    profile_id: userId,
    date_str: dateKey,
    meal_type: mealType,
    recipe_id: recipe.id,
    recipe_name: recipe.title || '',
  })
  setOpenMeal(null)
  onRefresh(dateKey)
}
```

---

## Task 2.4 — Fix computeMemberDailyNeeds field mapping

Open `lib/nutrition/memberRDA.js`.

The function starts with:
```js
const dc = member.baseDailyCalories || 2000;
```

But the profile objects from the database have `daily_calories_target`, not `baseDailyCalories`. Fix to accept both:
```js
const dc = member.baseDailyCalories || member.daily_calories_target || 2000;
```

---

## Verification

After all fixes, run:
```
cd D:\WORKS\Minty\NewMintyAprill2026\AprillBuild
npx next build
```

The build must complete without errors.

Then start the dev server (`npx next dev`) and verify:
1. The `/plan` page loads without errors
2. Clicking a day opens the Day Agenda
3. Clicking "+ Add recipe" opens the picker
4. Selecting a recipe adds it to the slot and it appears after refresh
