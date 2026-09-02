# Overnight Learnings

### Bugfix — Recipe detail page crash (MEAL_COLORS) — 2026-09-02
- Status: DONE
- Symptom: `/recipes/[slug]` showed eternal "Loading..." / error boundary for EVERY recipe (public and private).
- Root cause: `RecipeDetailClient.jsx` referenced `MEAL_COLORS` (meal-type pill styling) but the constant lived unexported in `RecipeNutrition.jsx` → `ReferenceError: MEAL_COLORS is not defined` during SSR → "Switched to client rendering" → client crashed the same way.
- Fix: `export const MEAL_COLORS` in `components/recipes/RecipeNutrition.jsx`; added it to the import in `components/recipes/RecipeDetailClient.jsx`.
- Gotcha worth remembering: a crashed client component can still leave a valid-looking `<title>` and recipe data in the RSC payload — checking `curl` output for the recipe name is NOT proof the page renders. Check for `Switched to client rendering` / `$RX(` error markers in the streamed HTML instead.
- Also confirmed: private recipes correctly 404 for anonymous visitors (RLS `profile_id = auth.uid() OR is_public = true`); owners see them when logged in. Verified via service-role-generated magic-link session cookie.
- Files modified: `components/recipes/RecipeNutrition.jsx`, `components/recipes/RecipeDetailClient.jsx`
