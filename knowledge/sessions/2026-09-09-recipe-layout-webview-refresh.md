# Session: Recipe page layout, catalogue image staleness, WebView refresh, paywall race
**Date**: 2026-09-09
**Duration**: ~1h
**Task**: Single recipe view restructure (image under heading, intro shown once) + fix 3 reported bugs: catalogue missing regenerated image, dark-mode "New photo" button invisible, Android app serving stale layout, "Upgrade to Pro" shown to a paid user.

## What Was Done
- **RecipeDetailClient restructure**: single responsive image block directly under the `<h1>` (replaces the old mobile-only + desktop-only duplicate blocks); intro text rendered ONCE under the image as `recipe.intro || recipe.description` (removed `description` paragraph under the heading and the `intro` paragraph before Instructions — they hold the same text because `/api/recipe/edit` writes `intro: rewritten.description`).
- **Catalogue image staleness**: `/api/recipe/regenerate-image` now also calls `revalidatePath('/recipes')` (the catalogue is a time-based ISR page `revalidate = 3600` — `revalidateTag` does NOT reach it); `RegenerateImageButton` calls `invalidateCache('recipes:')` on success (localStorage private-recipes list).
- **Dark mode button**: `RegenerateImageButton` text color hardcoded to `#111827` (was `var(--text-1)` → white-on-white in dark mode; the button bg is always translucent white).
- **WebView stale-layout self-heal**: new `GET /api/version` (no-store, returns `VERCEL_GIT_COMMIT_SHA || VERCEL_DEPLOYMENT_ID || 'dev'`); root layout bakes the same value as `window.__MINTY_BUILD__`; new `components/shared/DeploymentCheck.jsx` (root layout) compares on mount/focus/visibility/5-min interval and cache-bust reloads (`?_fresh=` URL, loop-guarded) on mismatch.
- **Paywall race**: DB confirmed ronald@outline.ee IS `subscription_tier='nutritionist'` (paid). Root cause: `AuthContext` sets `user` before `profile` finishes loading → `useSubscription()` returned `free` → teaser flash (or stuck teaser if the fetch failed on flaky WebView network). Fixes: `AssistantPanel` renders a neutral loading card while `authLoading || (user && !profile)`; `AuthContext.fetchProfile` retried once after 1.5s on error.
- SYSTEM.md updated (PWA/caching section, mutation-route note, shared/ listing).

## Findings

### What Worked
- Checking the DB directly with the service role key before "fixing" the paywall — the account was fine; the real bug was the client-side loading race.

### Bugs Found
- `revalidateTag('recipes')` only invalidates `unstable_cache` entries — it does NOT bust time-based ISR pages like `/recipes`. Any mutation that should reflect in the catalogue needs `revalidatePath('/recipes')` too.
- Theming: hardcoded light backgrounds must never pair with `var(--text-1)` — in dark mode that's white-on-white.
- `/api/recipe/edit` copies `description` into `instructions.intro`, so rendering both fields duplicates text on the detail page.

### New Knowledge
- Android WebView serves stale HTML from its own HTTP cache even with no service worker; the fix is a deployment-id check + cache-bust navigation (query param = new cache key). First install must still clear once to get a build containing the check.

## Recommendations

### Should be added to AGENTS.md (hot rules)
- Recipe mutations that affect the catalogue must call BOTH `revalidateTag('recipes')` AND `revalidatePath('/recipes')`.

### Should be added to knowledge/ (reference)
- None beyond this file.

## Supersedes
- None.
