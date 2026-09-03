# Session: Calorie-Budget Sharing Model — Consistency Fix
**Date**: 2026-09-03
**Duration**: ~1h
**Task**: Make the planner's calorie-budget sharing model (`computeMealBudget`) the single model used everywhere; fix `personal_nutrition` recompute on member toggle; update AGENTS.md.

## The Model (confirmed by user)
Each member: body measures → BMR → `baseDailyCalories` (+ activity). A meal's nutrients are sized per person's calorie target. A member's share of a shared meal = `personMealTarget / familyMealTarget`; `batchScale = familyMealTarget / recipeKcal`. Combined stored value = `recipe.totals × batchScale`.

## Logic mistakes found & fixed
1. **Member toggle (planner + DayAgenda) didn't recompute `personal_nutrition`** — only updated `consumer_member_ids`. The stored value went stale (said 3 people's nutrition while listing 2 consumers). **Fix:** both toggles now recompute `personal_nutrition = computeMealBudget(newConsumers, recipe.totals, meal).personalNutrition` and persist it with the new `consumer_member_ids`. Legacy rows (no recipe join) scale stored value by consumer-count ratio. Macros change with the toggle.
2. **StatisticsClient per-member cards equal-split the stored combined value** — over-counted kids, under-counted adults (verified: kid +233 kcal, dad −222 kcal on a sample meal). **Fix:** per-member split now uses `computeMealBudget` from `recipe.totals` (same as planner); falls back to calorie-target-share (not equal) when only the stored combined value exists. Added `recipeTotals` to normalizedRows.
3. **`/api/menus/apply` stored raw recipe totals** as `personal_nutrition` — under-reported the family in Statistics. **Fix:** route now fetches member metrics, enriches, and writes `computeMealBudget` output.
4. **`app/statistics/page.jsx` didn't select `consumer_member_ids`** and didn't enrich members (no `baseDailyCalories`). **Fix:** select includes `consumer_member_ids`; members enriched with `enrichMember({...m, age: ageFromDob(dob)})`.

## Files changed
- `components/planner/PlannerClient.jsx` (member toggle recompute)
- `components/planner/DayAgenda.jsx` (per-entry toggle recompute; `entry` passed to `toggleConsumer`)
- `components/statistics/StatisticsClient.jsx` (per-member calorie-budget split)
- `app/statistics/page.jsx` (select consumer_member_ids; enrich members; ageFromDob helper)
- `app/api/menus/apply/route.js` (fetch member metrics, compute budget, store it)
- `AGENTS.md` (rewrote "Nutrition Data Flow" section + "Files You Must Not Duplicate")

## What was already correct (not touched)
- `RecipeDetailClient` add-to-plan, planner `saveRecipeToDay`, DayAgenda `handleAddRecipe` — already compute `computeMealBudget` at write time.
- `DayStatsPanel` / `computeMealBudgetDayBreakdown` — already recompute per-member live (the reference implementation).
- `/api/nutritionist/calendar` — receives `personal_nutrition` already computed by the client.

## Findings
- **Invariant that makes the system consistent:** sum of per-member calorie-budget shares == stored combined `personal_nutrition`. With per-member computed from `recipe.totals` (not by dividing the stored value), planner and statistics always agree even if a stored row is stale. Verified numerically.
- **BMI fraction (`getMemberBMIFraction`) is dead** — no runtime callers; legacy fallback only. Do NOT build new logic on it.
- **`addNutrition` treats `personal_nutrition` keys and recipe `totals` keys interchangeably** — same key space, so budget output feeds it directly.

## Tooling note (for future sessions)
- The `edit` tool's **echo/result display was unreliable this session** — it showed garbled old/new text mid-write, but the on-disk content was actually correct. Lesson: after edits, verify with `read` (not the tool echo) + `npx next build`. Don't "repair" a file based on the echo alone — risk of introducing real corruption.

## Recommendations
### knowledge/
- Add to `anti-patterns/known-pitfalls.md`: "Updating `consumer_member_ids` without recomputing `personal_nutrition`" and "equal-splitting a combined `personal_nutrition` across members" — both are the same class of bug (sharing-model drift). Reference `computeMealBudget` as the fix.
- Trust-but-verify for subagent edit echoes — see tooling note above.

## Supersedes
- AGENTS.md "Nutrition Data Flow" section (old BMI-fraction / immutable wording).

---

## Follow-up: Estimated-member warning (same session, later)

User asked: when a member (e.g. a managed child) has no measured weight/height and falls back to age/gender reference estimates, show a warning + a link to fix it.

- `lib/member/enrichMember.js` — `enrichMember()` now returns `isEstimated` (true when weight/height/target fell back to estimates) and `estimatedFields { weight, height, calories }`. Detection keys off `m.weight == null || ''` and `m.height == null || ''` BEFORE substitution.
- New `components/planner/EstimatedMemberBanner.jsx` — dismissible amber banner, lists estimated member names (up to 3 + "+N more"), links to `/my-family` (where managed members' weight/height/DOB are edited).
- Rendered on `app/plan/page.jsx` and `app/statistics/page.jsx` (both normal + nutritionist client-view paths), passing the already-enriched `members`.
- Build passes; flag logic regression-tested (child no data → estimated; full data → not; missing height only → estimated).
