# Known Pitfalls

> Things that have broken before or fail silently. Check this before making changes.

## Auth & Data

- **profile_id null on recipe insert**: If you rely on React context for the current user at save time, the user object may not be hydrated yet. Always use `supabase.auth.getUser()` at the moment of insert inside a Server Action.
- **Stale session in Server Components**: Always call `supabase.auth.getUser()` — not `supabase.auth.getSession()`. `getSession()` reads from cache and can be stale. `getUser()` validates against the server.

## Schema

- **`image_thumb_url` not in migration**: The column is used in code but was never added via a formal migration in v1. Ensure it's in the v2 migration from the start.
- **`recipe_member_states` partially redundant**: Overlaps with `calendar_entries.member_id`. Could be consolidated — currently both are used; do not add a third similar structure.

## Nutrition Logic

- **Never duplicate BMR calculation**: `computeBMR()` lives ONLY in `lib/nutrition/portionCalc.js`. Writing a second BMR function will cause divergent nutrition numbers across the app.
- **Statistics does NOT calculate**: It only reads `personal_nutrition` from calendar entries. If you add calculation logic to Statistics, nutrition will be double-counted.
- **Journal entries have no BMI scaling**: They are facts (exact amounts eaten), not plans. Do not apply portion scaling.

## Next.js App Router

- **Mixing Server and Client in same file**: A file with `'use client'` cannot have `async` server-side data fetching. If you need both, split into a Server Component wrapper and a Client Component leaf.
- **`cookies()` in Client Components**: `cookies()` from `next/headers` only works in Server Components and Server Actions. Client Components cannot read cookies directly.
- **Forgot `'use client'` on event handlers**: A Server Component that uses `onClick`, `onChange`, etc. will throw at build time. Move interactive logic to a Client Component.

## Build & Deploy

- **`eslint: { ignoreDuringBuilds: true }`**: Convenient during dev but masks real issues. Remove before production or at least review lint output separately.
- **Environment variables prefix**: Browser-accessible vars must be `NEXT_PUBLIC_`. Server-only vars have no prefix. Never put secret API keys in `NEXT_PUBLIC_` vars.

## Caching

- **NEVER serve Next.js HTML stale (SWR) from a service worker**: Cached HTML references content-hashed `/_next/static/*` chunks that disappear after each redeploy. Result: CSS chunk 404 → unstyled page; JS chunk 404 → ChunkLoadError → "Something went wrong" error boundary. Self-heals after a few visits (background revalidation), so it looks intermittent and breaks again after every deploy. Hit in production 2026-09 (sw.js v1, SWR on public pages). Fix: page navigations must be **network-first**, cache used only as offline fallback. Static assets/images stay cache-first — hashed URLs make that safe. Also: bump `VERSION` in sw.js on any strategy change (activate purges old-version caches), serve `/sw.js` with `Cache-Control: no-cache`, and auto-reload once on ChunkLoadError in `app/error.jsx` for deploy-while-tab-open skew.
- **Response.body has ONE reader (service worker)**: `cache.put(request, new Response(response.body, …))` then `return response` = the put consumes the stream and the page gets a broken body → `net::ERR_FAILED` for chunks → "Application error: a client-side exception". Buffer once (`await response.blob()`), build both Responses from the blob. Hit in production 2026-09.
- **Never store base64 images in DB text columns**: they land in RSC/SSR payloads → multi-MB HTML (5.8MB /recipes page, 2026-09). `resizeAndUploadImages()` falls back to data URLs when storage upload fails — always verify the bucket exists. `normalizeRecipe()` strips heavy (>4KB) data URIs as a guard.
- **Planner week cache hides external writes**: `PlannerClient` caches week data (entries/activities/journals) in localStorage under `mintyfit:plan:week:{userId}:...` with a 30-min TTL and serves it without revalidating. Any write to `calendar_entries`/`food_journal`/`daily_activities` made OUTSIDE PlannerClient (e.g. Minty Chat journal logging) is invisible on /plan until TTL expiry. Fix pattern: call `bustPlanWeekCache(userId)` + dispatch `JOURNAL_SAVED_EVENT` from `lib/planner/planCache.js` after the write; PlannerClient listens and runs `refreshDay()`.

---
*Last updated: 2026-04-06*
*Confidence: High — learned from v1 and Next.js patterns*

- **Verify subagent/review bug claims against source before fixing**: A code-review subagent reported a "critical math bug" in `public/calculators/vitamin-d3-calculator-7.html` (claimed `break;` inside a comment → switch fall-through → wrong dose). The real file had a correct `break;`. Applying the "fix" blindly would have introduced the very bug reported. Same session: a second agent reported React calculator components "never used" — `BlogCalculatorEmbed` is imported by `BlogContent.jsx`. Hit 2026-09. Rule: for any claimed bug with line numbers, read those exact lines before editing.
- **Multiple fire-and-forget `.then()` chains writing one cache key**: three parallel fetch chains each did `cacheGet` → merge → `cacheSet` on the same `week:` key (PlannerClient). Chains resolving out of order silently dropped datasets. Also: no stale-response guard — fast week navigation let an older week's response clobber the newer week's state. Fix: one `Promise.all`, one cache write, `cancelled` flag in effect cleanup. Fixed 2026-09.
- **Untracked `setTimeout` for transient UI states**: `setTimeout(() => setState('idle'), 3000)` copy-pasted 6× (RecipeDetailClient) — fires setState after unmount, overlapping timers clear indicators early. Fix: ref-tracked timer, clear before re-arm, clear on unmount.
- **Mutating a server prop to reflect edits**: `Object.assign(recipe, editedRecipe)` in RecipeDetailClient — mutates the RSC prop; breaks on component reuse and confuses React. Fix: rename prop `initialRecipe`, hold local `recipe` state, sync via effect (same pattern as `members`).