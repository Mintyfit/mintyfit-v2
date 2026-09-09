# Data Fetching Patterns

> Learnings about how MintyFit v2 loads and caches data.

## Architecture

MintyFit v2 is a clean Next.js 15 App Router project. No Vite, no SPA bridge layer.

- **Server Components** (default): Direct Supabase queries in `app/` route files and layout components. Used for public pages (recipes, menus, blog) and initial data loads.
- **Client Components** (`'use client'`): Browser Supabase client via `lib/supabase/client.js` for interactive features (planner, journal, real-time updates).
- **Server Actions**: Used for mutations (create recipe, save journal entry, update calendar).

## Supabase Client Selection

| Context | Client | File |
|---|---|---|
| Server Component / Server Action | `createServerClient()` | `lib/supabase/server.js` |
| Client Component (browser) | `createBrowserClient()` | `lib/supabase/client.js` |
| Middleware | `createMiddlewareClient()` | `lib/supabase/middleware.js` |

## Recipe Caching

- Public recipe lists can be cached with Next.js `fetch` cache or `unstable_cache`
- User-specific data (calendar, family) should NOT be cached — always fresh from Supabase
- Cache tags for revalidation: `['recipes']`, `['menus']`, `['blog']`

## Nutrition Data

Nutrition is pre-computed at write time and stored on the record. Never compute on the fly during read. See `lib/nutrition/` for the pipeline.

---
*Last updated: 2026-04-06*
*Confidence: High — established architecture decisions*

## Parallel Queries in One Effect

When an effect needs multiple independent Supabase datasets (e.g. planner week: entries + activities + journals):
- Fire them in ONE `Promise.all` — never 3 serial awaits, never 3 fire-and-forget `.then()` chains.
- Do exactly ONE cache write after all resolve (per-chain read-merge-write races drop data).
- Add a `cancelled` flag in the effect cleanup so stale responses can't clobber newer state.
- `Promise.resolve({ data: null })` as the placeholder for conditionally-skipped queries keeps the destructuring shape.

(Applied in PlannerClient week/month fetch + refreshDay, 2026-09.)

## Loading UX & Caching (2026-09-09 perf pass)

- **Root `app/loading.jsx` does NOT re-show on client navigations** — once revealed, React transition semantics keep the old UI. Every slow/dynamic route needs its OWN segment-level `loading.jsx` (that's what produces instant loading states on nav). Skeletons use `.mf-skeleton` from globals.css.
- **Public recipe detail** uses `unstable_cache` (`recipe-public-by-slug`, tag `recipes`, 300s revalidate) with an `is_public=true` filter — private rows never enter the shared cache. Every recipe mutation route MUST call `revalidateTag('recipes')`.
- **`generateMetadata` + page share one query** via React `cache()` — never query twice per request.
- **Family members load client-side** on the recipe page (`useCachedData('members:{userId}')`, 5-min TTL, `invalidateCache('members:')` on family/weight writes). RLS scopes weight_logs to own rows in both server and browser contexts, so SSR member loading has no data advantage.
- **Middleware** skips `supabase.auth.getUser()` when no `sb-*` cookie exists (anonymous fast path).
- SSR pages: fire all queries keyed by the same id in ONE `Promise.all` batch; /plan went from 5 serial RTTs to 2 batches.