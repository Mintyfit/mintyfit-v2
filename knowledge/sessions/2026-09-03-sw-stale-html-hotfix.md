# Session: Service Worker Stale-HTML Hotfix
**Date**: 2026-09-03
**Duration**: ~30 min
**Task**: Production bug — mintyfit.com intermittently loads without CSS and /recipes sometimes shows "Something went wrong" for logged-out users; self-heals after a few visits.

## What Was Done
- Diagnosed root cause in `public/sw.js` (added in TASK 1.2): public pages cached stale-while-revalidate + `VERSION` never bumped → stale HTML served after every deploy, referencing dead content-hashed `/_next/static` chunks.
- `public/sw.js`: pages strategy SWR → **network-first** (cache kept only as offline fallback); `VERSION` v1→v2 so activate purges poisoned `mintyfit-*-v1` caches in users' browsers; comments updated.
- `app/error.jsx`: logs the error and auto-reloads once per 30s on ChunkLoadError / dynamic-import failure (covers deploy-while-tab-open skew that exists even without a SW).
- `next.config.mjs`: `/sw.js` now served `Cache-Control: public, max-age=0, must-revalidate` so browsers pick up SW updates promptly.
- Updated SYSTEM.md (PWA/Caching section), CHECKPOINT.md (hotfix entry), anti-patterns/known-pitfalls.md.
- `npm run build` — clean (71 routes).

## Findings

### What Worked
- The symptom triad "CSS sometimes missing + intermittent error boundary + fixes itself after several visits" is a fingerprint for stale-HTML/chunk-hash mismatch. The CHECKPOINT.md task history (TASK 1.2 service worker) pointed straight at the culprit.

### What Didn't Work
- SWR on HTML in a content-hashed-asset world — see pitfall entry.

### Bugs Found
- sw.js v1: stale-while-revalidate on public page HTML + static VERSION → broken pages after every Vercel deploy (production, logged-out users on public pages).

### New Knowledge
- Next.js App Router RSC fetches (client-side nav) are GET non-navigate requests — they fell through the SW untouched, which is why only full page loads broke, not SPA navigations.
- `skipWaiting()` + `clients.claim()` in the SW means the v2 worker self-heals users on their next visit after redeploy; no manual cache clearing needed.

## Recommendations

### Should be added to CLAUDE.md (hot rules)
- None — already captured in SYSTEM.md PWA section + known-pitfalls.

### Should be added to knowledge/ (reference)
- Added to `anti-patterns/known-pitfalls.md` (Caching section).

## Supersedes
- SYSTEM.md "PWA / Caching" bullet (updated in place).

---

## Part 2 (same day, follow-up report): "Application error: a client-side exception" + endless /recipes load

Two more root causes, found by probing production with headless Playwright (`probe-recipes.js` pattern — fresh context, capture `pageerror`/`requestfailed`):

1. **sw.js `fetchAndCache` stream bug** (present since TASK 1.2): `new Response(response.body)` + `cache.put(stamped)` consumed the body's single reader, then the original response was returned with a locked/disturbed stream → `net::ERR_FAILED` for JS/CSS chunks whenever the SW controlled the page with an empty static cache. Masked in v1 (chunks usually pre-cached before SW control); **exposed fleet-wide by my v1→v2 VERSION bump purging caches**. Fix: buffer body once via `response.blob()`, build two Responses from it. Rule: a ReadableStream has ONE reader — never pass `response.body` into another Response AND keep using the original.
2. **All images were base64 in Postgres** (135 recipes/270 fields/10.6MB, 0 storage URLs): `resizeAndUploadImages()` silently falls back to data URLs when storage upload fails, and legacy v1 rows were base64 → /recipes HTML was 5.8MB. Migrated 139 recipes + 5 menus to Supabase Storage via service-role script (backup first, idempotent, 0 failures). `normalizeRecipe()` now strips heavy (>4KB) data URIs as a permanent guard.

Verification pattern worth reusing: fetch live HTML and measure bytes + count `data:image` occurrences; DB probe via PostgREST with anon key; Playwright probe for ERR_FAILED chunks.
