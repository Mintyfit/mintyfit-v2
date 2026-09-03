# Session: Large File Audit + Performance Fixes
**Date**: 2026-09-03
**Duration**: ~2h
**Task**: Code review of all large files (after the 5MB HTML image-cards cleanup), then "fix all" findings.

## What Was Done

### Storage / artifacts
- Deleted `db-transfer/02-data.sql` (13.5MB) — byte-identical MD5-verified duplicate of `supabase/migrations/042_import_data.sql`. Updated `db-transfer/README.md` to point at the canonical copy. Kept the rest of db-transfer (transfer toolkit, still referenced by `scripts/fix-blog-images.mjs`; `mintyfit-db-transfer.sql` is the only combined dump).

### public/calculators (iframe widgets embedded in 3 blog posts)
- `magnesium-calc.html` — **full rewrite**: was React 18 UMD + Babel standalone + Tailwind Play CDN (~1MB blocking third-party JS, in-browser JSX transpile, `'unsafe-eval'` in CSP, no SRI). Now zero-dependency vanilla JS (43.6KB, was 48.3KB) with identical calculation logic and visual parity. CSP hardened (`unsafe-eval` and CDN hosts removed). Added meta description + canonical + `- MintyFit` title. Verified with a Node DOM-stub harness (all behavior tests pass).
- `vitamin-d3-calculator-7.html` — removed ~120 lines dead CSS (`.header*`, `.factors-grid`/`.factor-*`/`.function-*` — never emitted), removed redundant radio re-binding block (all radios have inline onchange; sex radios were double-bound → double full re-render), removed console.logs and `error.stack` DOM dump, throttled MutationObserver postMessage via rAF (was a message storm on slider drags), `postMessage` origin `'*'` → `window.location.origin`, added canonical/description/preconnect.
- `water-intake-calculator8.html` — added canonical/description/preconnect (was already the leanest).
- `next.config.mjs` — new `/calculators/:path*` headers: `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` (NOT immutable — files are edited in place) + `X-Robots-Tag: noindex` (raw iframes shouldn't index; canonicals point at parent blog posts).

### components/planner/PlannerClient.jsx
- **HIGH**: `clearWeek`/`clearMonthRange` — 7–21 serial `await refreshDay()` round trips → `Promise.all`.
- `refreshDay` (hottest path): 3 serial queries → 1 `Promise.all`; try/catch added.
- Week-fetch effect: stale-response guard (`cancelled` flag), 3 racing cache merges → single write after Promise.all, error handling, month effect got the same guard + month cache bust on clearMonthRange.
- Extracted shared helpers (was 3× verbatim): `ENTRIES_SELECT`, `entriesQuery()`, `groupEntriesByDate/Activities/Journals()`.
- `entries[key] || {}` fresh-identity churn (busted DayStatsPanel memos every render) → module-level `EMPTY_DAY`.
- Removed redundant `selectedMemberIds` reset effect; narrowed the union-sync effect dep from all `entries` to the selected day's slice.
- `weekDates`/`weekLabel` → one useMemo; merged duplicate mealBudget import; removed `console.log('[client-plan]')`.

### components/recipes/RecipeDetailClient.jsx
- `computeMealBudget` + `computeMemberDailyNeeds` (47 nutrients × members) ran on **every render incl. edit keystrokes** → useMemo'd (`eatingMembers`, `memberBudget`, `memberDailyNeeds`).
- List-view ingredient dedup IIFE rebuilt a Map every render → `flatIngredients` useMemo.
- `Object.assign(recipe, editedRecipe)` prop mutation → prop renamed `initialRecipe` + local `recipe` state with sync effect.
- 3× copy-pasted "collect checked ingredients" loops → `collectCheckedIngredients()`.
- 7× `createClient()+auth.getUser()` blocks → `getAuth()` helper (4 handlers converted; 3 once-per-mount effects left).
- 6× untracked `setTimeout(..., 3000)` → `flashStatus()` with ref-tracked timer + unmount cleanup.

### components/statistics/StatisticsClient.jsx + components/account/MyAccountClient.jsx (delegated, spot-verified)
- StatisticsClient: `dayTotals` folded into `rowsByDate` memo; hand-rolled 70/170/30 fallback chain → shared `enrichMember()`; `nutritionFieldByKey`/`recipeById` Maps; lazy Set initializers; `<a>` → `<Link>`.
- MyAccountClient: `BMRBreakdown` 47-nutrient recompute per keystroke → useMemo; saved-timer cleanup; `window.location.reload()` ×2 → local state; sparkline double point calc → single pass; `useState(initialWeightLogs || [])`; styles hoisted to module scope.

### Verification
- `npx next build` passes (all routes, incl. /plan, /recipes/[slug], /statistics, /my-account).
- Magnesium calc: Node DOM-stub harness — render, sex-conditional pregnancy field, fasting, deficit/no-deficit, symptom counting all pass.

## Findings

### What Worked
- Node DOM-stub harness for verifying standalone calculator HTML without a browser — fast, catches logic regressions.
- MD5 hash check before deleting "duplicate" files — proved byte-identity.
- Reading the actual file lines before applying review fixes — see Bugs Found #1.

### What Didn't Work
- The review subagent **hallucinated its #1 "critical" bug** (claimed D3 calc line 698 had `break;` inside a comment → 25% vs 10% math error). The real file had a correct `break;` on its own line. **Always verify subagent-reported bugs against the source before "fixing"** — a wrong fix here would have introduced a real math bug.
- A second subagent claimed the React calculator components were "never used" — `BlogCalculatorEmbed` IS imported by `BlogContent.jsx` (the CALCULATOR: marker pipeline is live code, just unused by current DB content). Deleting them would have broken the documented embed path.

### Bugs Found
- Pre-existing (not fixed, low priority): Planner member-toggle updates `consumer_member_ids` without recomputing `personal_nutrition`; StatisticsClient splits shared `personal_nutrition` equally instead of by member targets (contradicts AGENTS.md data flow). Both need a deliberate product decision, not a drive-by fix.
- MonthView month-fetch still joins full 47-nutrient `recipes.nutrition` JSONB — deliberately kept (kcal badge uses `perServing.energy_kcal`; PostgREST JSON subfield select too fragile).

### New Knowledge
- The three calculator iframes use three different stacks (vanilla / poor-man's-React / real-React-UMD) — now all vanilla-style after the magnesium rewrite.
- `components/calculators/` (React embed system) is dormant infrastructure: wired into BlogContent but no DB content uses `<!-- CALCULATOR:slug -->` markers, and its formulas diverge from the live iframe versions. Needs a product decision (port formulas + migrate DB content, or formalize iframes) — NOT a deletion candidate.
- Blog DB content hardcodes absolute calculator URLs on two hosts (`mintyfit.com` and `app.mintyfit.com`); `BlogContent.jsx` rewrites them to same-origin at runtime. Renaming calculator files requires a DB content update — do not rename repo-side only.

## Recommendations

### Should be added to AGENTS.md (hot rules)
- None — existing rules cover it.

### Should be added to knowledge/ (reference)
- Add to `anti-patterns/known-pitfalls.md`: "Verify review/subagent bug claims against source before fixing — a hallucinated bug report nearly introduced a real math bug in the D3 calculator (claimed fall-through; break was present)."
- Add to `patterns/data-fetching.md`: "Multiple independent Supabase queries in one effect → single Promise.all + single cache write + `cancelled` flag. Never fire-and-forget `.then()` chains that merge into the same cache key — they race and silently drop datasets."

## Supersedes
- None.
