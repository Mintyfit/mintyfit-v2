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
