# Session — Site-wide perceived-performance pass (loading skeletons + data cache + query parallelization)

## Goal
User report: mintyfit.com feels slow — Recipes/Plan/Stats "show loading every time like no cache existed"; single recipe page slow AND shows no loading at all. Asked about Elastic as a fix.

## Verdict on Elastic
Wrong tool. Elasticsearch solves search relevance, not page-load latency. Bottlenecks were per-request DB round trips, no route-level caching, missing loading states. Recipe search already has Postgres FTS (migration 059). Do NOT add Elastic for this class of problem.

## Measured diagnosis (live probing via curl --ssl-no-revoke)
- `/recipes` was already edge-cached (X-Vercel-Cache: HIT, ~0.5s TTFB).
- `/recipes/[slug]` was `force-dynamic`, X-Vercel-Cache MISS every hit, 0.3–1.1s TTFB **anonymous**; logged-in adds a serial ~6-query chain (auth→memberships→family→weight_logs).
- `generateMetadata` AND the page each ran the full recipe query — no dedup.
- Only root `app/loading.jsx` existed → already-revealed Suspense boundary = NO fallback shown on client navigations (React transition semantics). That's why recipe detail "didn't even show loading".
- Middleware ran `supabase.auth.getUser()` (network RTT) on EVERY request incl. anonymous traffic.

## Fixes applied
1. **Segment loading.jsx skeletons**: app/recipes, app/recipes/[slug], app/plan, app/statistics + `.mf-skeleton` pulse utility in globals.css.
2. **Recipe detail fast path**: `unstable_cache(slug → public recipe row, tag 'recipes', revalidate 300)` with `is_public=true` filter (private rows never enter shared cache); React `cache()` dedupes metadata+page; private/legacy-slug requests fall through to the cookie-auth path. **Repeat views: ~0.03s vs 0.3–1.1s** (verified locally with next start).
3. **Server-side member loading REMOVED from recipe detail** — RecipeDetailClient hydrates via new module-level `fetchFamilyMembers()` wrapped in `useCachedData('members:{userId}', 5min)`. Justification: RLS scopes weight_logs to own rows in BOTH server and browser contexts, so SSR had zero data advantage. Signature-guarded apply (member-id join) so background SWR doesn't reset eater checkboxes.
4. `revalidateTag('recipes')` added to /api/recipe/{update,edit,delete,regenerate-image}.
5. `invalidateCache('members:')` added to MyFamilyClient (add child, rename, remove linked, remove managed) + MyAccountClient (saveProfile, logWeight).
6. **/plan SSR**: 5 serial queries → 2 parallel batches (profile∥memberships∥own-weight; then linked∥managed∥weight_logs). weight_logs batch-2 query uses `.eq('profile_id', user.id)` — identical output under current RLS (policy allows own rows only); revisit if family-read RLS is ever added.
7. **Middleware anon fast path**: no `sb-*` cookie → skip getUser() entirely; protected paths redirect straight to login.

## Files changed
- `app/globals.css` (.mf-skeleton), 4× loading.jsx (new)
- `app/recipes/[slug]/page.jsx` (rewritten), `components/recipes/RecipeDetailClient.jsx`
- `app/api/recipe/{update,edit,delete,regenerate-image}/route.js` (revalidateTag)
- `components/family/MyFamilyClient.jsx`, `components/account/MyAccountClient.jsx` (invalidateCache)
- `app/plan/page.jsx`, `middleware.js`, `SYSTEM.md`

## Verification
- `npm run build` green twice (stopped leftover `next start` PID on :3000 first — remember: never build while a server is live).
- `next start` smoke test: / 200, /recipes 200 static (0.026s), /plan+stats anon → instant 307 (middleware fast path works), recipe detail 200 with full content + JSON-LD; repeat 0.03s.
- Pre-existing quirk confirmed on live too: bad recipe slugs return HTTP 200 (soft 404) — NOT a regression; candidate for a future SEO fix.

## Not done / follow-ups
- **Vercel region pinning**: need Supabase region from user (Dashboard → Settings → General) to set Vercel function region to match — likely the single biggest remaining TTFB lever for logged-in dynamic pages.
- PlannerSidebar still refetches its recipe list on every mount (spinner on desktop) — candidate for useCachedData.
- No git commit/push done — user deploys.
