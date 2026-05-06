# Fix B — Add to Plan from Recipe Detail

Project: D:\WORKS\Minty\NewMintyAprill2026\AprillBuild

## Problem

The "Add to Plan" button on the recipe detail page (`components/recipes/RecipeDetailClient.jsx`) shows a toast saying "Go to your Planner" but does NOT actually add the recipe to the plan. It needs to insert a row into `calendar_entries` in Supabase.

## Database schema for calendar_entries

```sql
id          UUID PK (auto)
profile_id  UUID NOT NULL    -- the logged-in user's ID
date_str    TEXT NOT NULL     -- 'YYYY-MM-DD' format  ← NOT "date"
meal_type   TEXT NOT NULL     -- breakfast | snack | lunch | snack2 | dinner
recipe_id   UUID NOT NULL
recipe_name TEXT NOT NULL DEFAULT ''
created_at  TIMESTAMPTZ
```

## Fix

Open `components/recipes/RecipeDetailClient.jsx`.

### Step 1: Add Supabase client import
At the top, add:
```js
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
```

### Step 2: Add state for the "Add to Plan" UI
Inside the component, add these states:
```js
const { user } = useAuth()
const [planModal, setPlanModal] = useState(false)  // show meal slot picker
const [planMeal, setPlanMeal] = useState('dinner')
const [planDate, setPlanDate] = useState(() => new Date().toISOString().split('T')[0]) // today
const [planState, setPlanState] = useState('idle') // 'idle' | 'saving' | 'done' | 'error'
```

### Step 3: Replace the "Add to Plan" button
Find the current button:
```jsx
<button
  onClick={() => { setShowAddPlanMsg(true); setTimeout(() => setShowAddPlanMsg(false), 2000) }}
  ...
>
  📅 Add to Plan
</button>
```

Replace with:
```jsx
<button
  onClick={() => { if (!user) { window.location.href = '/?auth=login'; return } setPlanModal(true) }}
  style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer' }}
>
  📅 Add to Plan
</button>
```

### Step 4: Add the save function
```js
async function handleAddToPlan() {
  if (!user) return
  setPlanState('saving')
  try {
    const supabase = createClient()
    await supabase.from('calendar_entries').insert({
      profile_id: user.id,
      date_str: planDate,
      meal_type: planMeal,
      recipe_id: recipe.id,
      recipe_name: recipe.title || '',
    })
    setPlanState('done')
    setTimeout(() => { setPlanState('idle'); setPlanModal(false) }, 1500)
  } catch {
    setPlanState('error')
    setTimeout(() => setPlanState('idle'), 2000)
  }
}
```

### Step 5: Add the modal JSX
Remove the old `showAddPlanMsg` toast and replace with this modal. Add it just before the closing `</div>` of the component:

```jsx
{planModal && (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    onClick={e => e.target === e.currentTarget && setPlanModal(false)}
  >
    <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
      <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Add to Meal Plan</h3>
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.title}</p>

      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.375rem' }}>Date</label>
      <input
        type="date"
        value={planDate}
        onChange={e => setPlanDate(e.target.value)}
        style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.9375rem', marginBottom: '1rem', outline: 'none', boxSizing: 'border-box' }}
      />

      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Meal slot</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'breakfast', label: '🌅 Breakfast' },
          { key: 'snack', label: '🍎 Morning Snack' },
          { key: 'lunch', label: '☀️ Lunch' },
          { key: 'snack2', label: '🍊 Afternoon Snack' },
          { key: 'dinner', label: '🌙 Dinner' },
        ].map(m => (
          <button
            key={m.key}
            onClick={() => setPlanMeal(m.key)}
            style={{
              padding: '0.5rem 0.875rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
              border: `1.5px solid ${planMeal === m.key ? 'var(--primary)' : 'var(--border)'}`,
              background: planMeal === m.key ? 'rgba(61,138,62,0.08)' : 'var(--bg-page)',
              color: planMeal === m.key ? 'var(--primary)' : 'var(--text-2)',
              fontWeight: planMeal === m.key ? 600 : 400, fontSize: '0.9375rem',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {planState === 'error' && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Failed to add. Try again.</p>}

      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <button
          onClick={() => setPlanModal(false)}
          style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 500 }}
        >
          Cancel
        </button>
        <button
          onClick={handleAddToPlan}
          disabled={planState === 'saving' || planState === 'done'}
          style={{
            flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none',
            background: planState === 'done' ? '#10b981' : 'var(--primary)',
            color: '#fff', cursor: planState === 'saving' ? 'wait' : 'pointer',
            fontWeight: 700, fontSize: '0.9375rem', opacity: planState === 'saving' ? 0.7 : 1,
          }}
        >
          {planState === 'saving' ? 'Adding…' : planState === 'done' ? '✅ Added!' : 'Add to Plan'}
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 6: Remove old code
Remove the old `showAddPlanMsg` state and the old toast `<div>` that showed "Go to your Planner". They're replaced by the modal.

## Verification

Run `npx next build`. Then test: open a recipe, click "Add to Plan", pick a date and meal slot, click Add. Go to /plan and verify the recipe appears on the selected day.
