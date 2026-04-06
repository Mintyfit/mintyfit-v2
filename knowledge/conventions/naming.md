# Naming Conventions

## Files
- React components: `PascalCase.jsx` (e.g., `RecipeCard.jsx`, `PlannerClient.jsx`)
- Utilities/lib: `camelCase.js` (e.g., `portionCalc.js`, `recipeGenerator.js`)
- Hooks: `use*.js` (e.g., `useAuth.js`, `useLocalStorage.js`)
- Next.js routes: `page.jsx` / `layout.jsx` / `route.js` inside directory per App Router convention
- Server Actions: `actions.js` co-located with the route that uses them

## Database
- Tables: `snake_case` (e.g., `family_members`, `calendar_entries`, `food_journal`)
- Columns: `snake_case` (e.g., `profile_id`, `date_str`, `meal_type`)
- JSONB fields: `camelCase` inside JSON (e.g., `personal_nutrition` column contains `{ energy_kcal, protein }`)

## JavaScript
- Variables/functions: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` (e.g., `NUTRITION_FIELDS`, `RECIPE_SELECT`, `MEAL_TYPES`)
- Meal types: lowercase strings `['breakfast', 'snack', 'lunch', 'snack2', 'dinner']`

## URL Slugs
- Lowercase kebab-case: `chicken-caesar-salad`, `4-week-mediterranean-plan`
- No UUIDs in URLs — always use human-readable slugs
- Recipe slugs generated from title: lowercase, spaces → hyphens, special chars removed

---
*Last updated: 2026-04-06*
