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