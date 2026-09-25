# Session — Mobile Minty Chat shows OLD behavior (no 3 option cards)

**Date**: 2026-09-21
**Repo**: `AprillBuild` (web — no code change needed) + Android shell

## Symptom

On mobile (Android app), Minty Chat generated a recipe immediately when asked ("create X") — no 3 option cards, no real conversation. Desktop showed the correct new flow. User: "It looks to be an older version on mobile."

## Root cause

Stale JS bundle in the WebView HTTP cache — the device is running pre-`30c1456` chat code.

Evidence chain:
- Current `/api/assistant` returns `{ intent: 'create_recipe', options: [3] }` and NEVER triggers generation itself — picking an option card client-side is the only generation path.
- `git show 30c1456~1:components/assistant/AssistantPanel.jsx` — the old client did `runGeneration(data.recipe_prompt)` immediately on `create_recipe` intent. Exactly the reported mobile behavior. (Current API doesn't even send `recipe_prompt`, so the stale client generates from `undefined` → generic recipe.)
- 3-option chat shipped in `30c1456` (2026-09-09); the WebView self-heal (`DeploymentCheck` + `/api/version`) shipped AFTER it in `d1e0545`. **Bundles older than `d1e0545` contain no self-heal — they cannot recover on their own** (documented in sessions/2026-09-10-app-staleness-selfheal-deploy.md).

## Fix (user-side, no code change)

1. Update the app to v1.3 from Play — `check_releases.py` confirms versionCode 4 / 1.3 live on production; `nukeStaleWebStateAfterUpgrade()` wipes WebView cache/cookies/storage on upgrade → fresh bundle.
2. Already on v1.3 and still stale → Android Settings → Apps → MintyFit → Storage → Clear cache/data (or reinstall).
3. Mobile browser instead of app → hard refresh / clear site data.

Verify: ask "create a beef burger" → must show 3 option cards, not immediate generation.

## Pattern note

This is the 4th staleness-class incident (sw.js SWR → SW removal → unpushed self-heal → now pre-self-heal cached bundle). Rule stands: **freshness self-heal only protects builds that contain it** — any device that cached a pre-`d1e0545` bundle stays stale until app update or manual cache clear. When a user reports "mobile behaves like an old version", check the WebView bundle age FIRST, not the feature code.
