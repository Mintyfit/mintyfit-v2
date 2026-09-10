# Session: Recipe regenerate-image "no URL" fix
**Date**: 2026-09-10
**Duration**: ~1h
**Task**: User got "Image provider returned no URL" when generating a photo on the single recipe page.

## What Was Done
- Diagnosed: the error came from `/api/recipe/regenerate-image` (line 72) — the ONLY place in the codebase that **self-fetches its own API routes** (`fetch(new URL(request.url).origin + '/api/ideogram')`, forwarding the raw `cookie` header).
- Probed Ideogram directly with the app's exact request body → **HTTP 200, healthy** (billing fine; same key `nb8pd7…mAcw` as the 2026-09-09 fix). Provider was NOT the problem.
- Root cause: the self-fetch pattern. When the inner `/api/ideogram` returns any JSON error (401 from cookie staleness/refresh-token rotation race with the outer auth check, 500 missing env var, or an Ideogram error passthrough like 402), the route parsed the body, found no `data[0].url`, and threw the opaque "Image provider returned no URL" — hiding the real reason.
- Fix (extract-lib, no self-fetch):
  - NEW `lib/recipe/ideogramServer.js` — `callIdeogramApi(body)` (never throws; returns `{ok, status, data}`), `extractIdeogramImageUrl(data)`, `describeIdeogramError(data)`. SERVER ONLY.
  - NEW `lib/recipe/saveRecipeImageServer.js` — `saveRecipeImage(imageUrl, pathKey)` extracted from the save-image route (download → sharp 640×360/320×180 → service-role upload). SERVER ONLY.
  - `app/api/ideogram/route.js` — now a thin auth wrapper over `callIdeogramApi` (client contract unchanged).
  - `app/api/recipe/save-image/route.js` — thin auth+validation wrapper over `saveRecipeImage` (same status codes: 502 upstream/download, 500 storage).
  - `app/api/recipe/regenerate-image/route.js` — calls both libs in-process; surfaces the real provider error: `Image generation failed (<status>): <reason>` + server-side `console.error` with the response body. No more cookie forwarding or origin guessing.

## Findings

### What Worked
- Probing the provider directly first (curl --ssl-no-revoke + --data-binary @file) — instantly ruled out billing/API-key and focused the search on app code.
- Extract-lib refactor: one source of truth, both HTTP routes keep their contracts, server-side caller drops a whole network hop + double auth round trip.

### What Didn't Work
- Live route testing from the shell was painful: `Start-Process npm run dev` + Invoke-WebRequest/curl POSTs hung repeatedly (PowerShell quoting + a port-3000 collision with ANOTHER project's stale dev server — iPUMPS — sharing the same temp log path). What finally worked: **write a .ps1 script file and run it** (`powershell -NoProfile -File`), and **launch dev on a dedicated port** (`npm run dev -- -p 3210`). Also: other agents' processes live in this box — kill node only by StartTime filter, never blanket.

### Bugs Found
- regenerate-image self-fetch hid the true provider/auth error behind "Image provider returned no URL" (fixed).
- Note: the route still persists the ephemeral Ideogram CDN URL when storage save fails (deliberate "better than nothing" fallback) — contradicts the chat pipeline's deliberate "never persist ephemeral URLs". Left as-is (behavior change = product decision), flagged to user.

### New Knowledge
- **Never self-fetch your own API route from another route handler.** It re-runs auth on forwarded cookies (refresh-token rotation can invalidate the forwarded jar mid-request), depends on public origin resolution, and makes errors opaque. Extract the core into a server lib; keep HTTP routes as thin wrappers for client callers.
- Ideogram v3 success body: `{created, data: [{url, is_image_safe, prompt, resolution, seed, style_type, upscaled_resolution}]}`; errors come as JSON `{error|message}` with the upstream status.

## Recommendations

### Should be added to AGENTS.md (hot rules)
- None (covered by anti-patterns entry; promote only if it recurs).

### Should be added to knowledge/ (reference)
- `anti-patterns/known-pitfalls.md` — self-fetch anti-pattern (added).
- `patterns/ai-integration.md` — new lib structure + regenerated-route flow (updated).

## Supersedes
- `sessions/2026-09-09-chat-recipe-options-quality.md` § "Regenerate image feature" — the route no longer self-fetches; flow is now in-process via `lib/recipe/ideogramServer.js` + `lib/recipe/saveRecipeImageServer.js`.

## Verification done
- Live smoke test of `callIdeogramApi`/`extractIdeogramImageUrl` against the real Ideogram API: ok=true, 200, URL extracted.
- `npm run build` green (compile 6.8s, lint+types OK; all 3 routes registered).
- Dev-server sanity: all 3 routes return 401 JSON unauthenticated (auth contracts intact).

## Remaining for user
- The actual end-to-end click-through ("New photo" button on a recipe page) needs an authenticated browser session — if it still fails, the error message will now state the REAL reason (e.g. 402 insufficient_funds, 401, env var missing), which makes any remaining issue trivial to diagnose.
