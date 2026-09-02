# Session: Chat Journal → Planner Cache Sync Fix
**Date**: 2026-09-02
**Duration**: ~30 min
**Task**: Bug — Minty Chat said it logged a ham & cheese sandwich to the journal, but nothing showed on /plan for today.

## What Was Done
- Traced the flow: `AssistantPanel.saveJournalEntry()` inserts into `food_journal` correctly (success message only fires on error-free insert), but `PlannerClient` was never notified.
- Root cause: `PlannerClient` serves its week (including `journals`) from a localStorage cache (`mintyfit:plan:week:{userId}:...`, 30-min TTL) and returns early on cache hit. The chat wrote to the DB but never invalidated the cache or the planner's in-memory state — so the entry stayed invisible on /plan (even across reloads) for up to 30 min. It WAS in the DB (Statistics would have shown it).
- Fix:
  - New `lib/planner/planCache.js` — shared `PLAN_CACHE_PREFIX`, `JOURNAL_SAVED_EVENT`, `bustPlanWeekCache(userId)`.
  - `AssistantPanel.jsx` — after successful journal insert: `bustPlanWeekCache(user.id)` + dispatch `JOURNAL_SAVED_EVENT` with `{ dateKey }`.
  - `PlannerClient.jsx` — uses shared `PLAN_CACHE_PREFIX`; listens for `JOURNAL_SAVED_EVENT` → `refreshDay(dateKey)` (which already re-fetches the day's `food_journal` and busts the current week cache).
- Updated SYSTEM.md utility table; verified with `npm run build` (passes).

## Findings

### What Worked
- Following the codebase's existing CustomEvent invalidation convention (`hooks/useCachedData.js` `mintyfit:cache-invalidate`) instead of inventing a new mechanism.
- Shared constant module for the cache prefix/event name — this bug was literally caused by two components drifting apart, so a shared contract prevents recurrence.

### What Didn't Work
- n/a (first approach held)

### Bugs Found
- **Primary**: external writes invisible to planner due to localStorage cache (fixed, see above).
- **Adjacent, noted not fixed**: `refreshDay()` busts only the CURRENT week key; mutations while viewing a non-current week leave that week's other cache entries stale. Low impact (refreshDay updates in-memory state for the edited day anyway).
- **Adjacent, noted not fixed**: `toDateKey()` uses `toISOString()` (UTC) despite the "local-date key" comment. Chat insert and planner reads both use UTC so they're mutually consistent, but "today" is UTC-midnight-boundary sensitive for non-UTC users. Consistent local-date handling would be a separate, wider change.
- **Adjacent**: `MonthView.jsx` reads `e.journal_entries` off calendar entries, which the planner query never joins — month view likely never shows journal markers. Not investigated further.

### New Knowledge
- The planner's localStorage week cache is a silent-staleness trap for ANY out-of-planner write (documented in `knowledge/anti-patterns/known-pitfalls.md`).

## Round 2 — Journal nutrition not surfaced (same session, follow-up report)

User confirmed logging worked after Round 1, but: (a) no nutrition for the entry in the plan side panel, (b) only 5 macros in "Nutrition & % of daily needs", (c) Statistics showed sparse/wrong data for the entry.

Root causes found & fixed:
1. **DayStatsPanel ignored journals entirely** — it only received `entries` (calendar). Fix: PlannerClient passes `journals={dayJournals}`; DayStatsPanel maps journal rows to the legacy fallback entry shape (`{ member_id, consumer_member_ids, personal_nutrition: je.nutrition, recipes: null }`) and merges them before `computeMealBudgetDayBreakdown`/`computeMealBudgetDayNutrition`. Zero changes to the mealBudget single-source-of-truth.
2. **Journal writes stored only 5 nutrients** (`energy_kcal, protein, carbs_total, fat_total, fiber`) in 3 places: `/api/assistant` log_food Grok prompt AND its response picker, `JournalEntryForm` quick-add prompt, `JournalEntryForm` AI-describe prompt + `handleSaveResolved` picker. Fix: all now use the full 53-field template (`EMPTY_NUTRITION` exported from `lib/journal/grokFoodLookup.js`) and a new canonical parser `pickNutritionFields()` in `lib/nutrition/nutrition.js`. max_tokens bumped 800/1000 → 2000.
3. **Statistics** was already aggregating journal rows correctly — its "wrong info" was purely the 5-field data. No code change needed there.

Pattern worth remembering: when a write path stores a *subset* of a canonical shape, every downstream consumer silently degrades. The fix is at the write path (full template + canonical picker), not in each consumer.

## Recommendations

### Should be added to CLAUDE.md/AGENTS.md (hot rules)
- Not yet — promote only if a second session hits cache-staleness elsewhere.

### Should be added to knowledge/ (reference)
- Done: `anti-patterns/known-pitfalls.md` → new "Caching" section with the planner week-cache pitfall + fix pattern.

## Supersedes
- None.
