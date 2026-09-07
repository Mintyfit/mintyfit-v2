# Session: App Shell Stale UI → Service Worker Cache Removed Entirely
**Date**: 2026-09-07
**Task**: Bug — in the installed Android app, logged-out users saw the new Minty Chat teaser, but after logging in (ronald@outline.ee, super_admin/nutritionist tier) they saw the OLD pre-chat UI. Browser was fine. Mobile-only.

## Diagnosis
- Production HTML (probed via Invoke-WebRequest) matched the repo — server was serving current code.
- ronald's profile tier (`nutritionist`) IS in `VOICE_ASSISTANT_TIERS`, so current code renders the new chat for him. Tier gating was NOT the bug (user hypothesis: "old admin users don't have it implemented" — ruled out by DB check).
- User confirmed: **mobile browser works, only the installed app shows old UI** → the installed WebView shell was holding stale content from the service worker cache layer (sw.js v2, network-first pages + cache-first chunks). The shell's cached chunks predated Minty Chat.

## Product Decision (from user)
The app must NOT have its own cache — it is a thin shell that draws ALL content from the web. So instead of fixing the SW caching strategy again (third incident), the service worker cache is **removed entirely**.

## Fix
1. `public/sw.js` → self-purging no-op: NO `fetch` handler (network passthrough); on activate deletes every Cache Storage entry + unregisters itself. `VERSION = 'v3-nocache'` forces the update.
2. `components/shared/ServiceWorkerRegistrar.jsx` → DELETED. Replaced by `components/shared/ServiceWorkerCleanup.jsx` (mounted in root layout): on every page load, unregisters ALL SW registrations + deletes ALL caches. Two cleanup paths cover both clients that load a page (cleanup component) and workers that self-update (sw.js).
3. Kept `/sw.js` no-cache header in next.config.mjs (needed so the purging worker propagates). Kept `public/manifest.json` (install metadata, no caching).
4. Docs: SYSTEM.md "PWA / Caching" section rewritten, AGENTS.md got a "No Service Worker Cache — Ever" rule, CHECKPOINT.md hotfix entry.

## Bonus Fix (same commit): font too small
User reported text too small in app AND browser despite earlier Phase 2.1 attempt. Root cause: root `html` font-size was only set under `@media (max-width: 767px)` — desktop/unset case fell back to the browser/WebView default, which on Android WebView is ~14–15px (not 16px). Fix: explicit root sizes — `html { font-size: 17px }`, 18px ≤767px, 18.5px ≤380px. Since most components use rem, this scales the whole app.

## Findings
- **A service worker cache in a WebView-wrapped site is a recurring stale-UI generator.** This was the THIRD SW-caused production incident (2026-09-03 ×2, 2026-09-07 ×1). Pattern: each fix made the cache "safer" but the class of bug persisted. Final answer: remove the cache layer. If a 4th incident ever appears, check for any reintroduced SW.
- Diagnostic sequence that worked: (1) probe live HTML to confirm server serves current code, (2) verify user-tier gating logic against the DB record, (3) ask user whether browser reproduces it — isolates shell-cache vs code-path in one step.
- "Old UI for logged-in users only" made sense post-hoc: logged-out `/recipes` HTML was cached, but the app shell's chunk cache was older than the chat feature; authed pages (/plan etc.) were never HTML-cached, but their stale JS chunks rendered the old UI.

## Verification
- `npm run build` green (one flaky 0xC0000409 worker crash — known Windows commit exhaustion, retry passed).
- Pushed to origin/main. Field verification: open the app once (purge runs), then old UI gone.
