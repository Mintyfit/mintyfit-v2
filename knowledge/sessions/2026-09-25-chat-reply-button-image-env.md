# Session — Minty Chat reply button + AI image gen (stale Vercel env) + Shop→List

**Date**: 2026-09-25
**Scope**: `components/assistant/AssistantPanel.jsx`, `components/Navbar.jsx`, Vercel project env

## What the user asked for
1. Minty Chat: after the second reply the reply button disappears — can't enter a reply.
2. Find out why AI image generation is not working. If Ideogram doesn't work, can we use Grok for images?
3. Change the "Shop" nav label to "List".

---

## 1. AI image generation — root cause was NOT the Ideogram API

### Evidence chain (how it was pinned down)
- **Ideogram API is healthy.** Direct probe (`curl.exe --ssl-no-revoke`) → `POST /v1/ideogram-v3/generate` **HTTP 200 in ~17s**, returns an ephemeral URL; the URL downloads fine (1.5 MB PNG). So "the API is broken" was false.
- **Full backend pipeline is healthy.** Standalone script drove the exact `saveRecipeImage()` path end-to-end: Ideogram generate → download ephemeral → `sharp` resize (640×360 + 320×180 JPEG) → Supabase Storage upload via service role → public URLs reachable (HTTP 200). All 8 steps PASS.
- **The DB localised the break in time.** Queried `recipes.image_url` ordered by `created_at` and classified each row:

  | created | image kind |
  |---|---|
  | …2026-09-09T15:34 | `STORAGE-OK` (real photo) |
  | 2026-09-10T07:38 → 2026-09-24 | **`SVG-PLACEHOLDER` (5 of 5)** |

  141/146 recipes have real photos; **every single recipe created after 2026-09-09 fell back to the SVG placeholder.** That is a hard, dated regression boundary.
- **Vercel env told us why.** `GET /v10/projects/{id}/env` → `IDEOGRAM_API_KEY` **`createdAt = updatedAt = 2026-04-06`** — never touched. But `knowledge/sessions/2026-09-09-chat-recipe-options-quality.md` records the user generating a **fresh active key** after fixing Ideogram billing. `.env.local` holds that same key and it works. (Key material intentionally not recorded here — identify it by the rotation date, not by fragments.)

### Root cause
The 2026-09-09 key rotation was applied to **`.env.local` only**. Production kept the April key, which stopped working. Every recipe generated through production from 2026-09-10 onward silently fell back to `generateSvgFallback()` (the code swallows the failure and saves the emoji placeholder), which is why nothing "errored" — recipes just had no photo.

### Fix
- `PATCH /v10/projects/prj_mHgr1uu1WvElFSiwF7clWBLrIkMd/env/jL0reaUmo71UgQ4B` → set to the active key.
- Redeployed production from the same commit (`POST /v13/deployments` with `deploymentId` = current prod) so the key is baked in. New deployment `dpl_4VWSWZ232CYqRFYBzhKSMCd9iiwT` → READY.

**Note:** env vars are baked into a deployment at build time — updating the value alone does nothing until a redeploy happens.

### Answer to "can we use Grok for images?"
**Yes — and it works now** (this contradicts the 2026-09-09 finding that xAI image models "hung >3 min", which is stale).
- `GET /v1/models` lists `grok-imagine-image`, `grok-imagine-image-2.0`, `grok-imagine-image-quality`, `grok-imagine-image-video*`.
- `POST /v1/images/generations` → **HTTP 200 in 5–14s**, returns a `imgen.x.ai` JPEG URL that downloads fine (395 KB).
- But **no switch is needed** — Ideogram is not broken and is the current provider. Grok is a viable fallback if Ideogram billing lapses again. Note the xAI URLs are also ephemeral (`xai-tmp-imgen-*`), so the same `saveRecipeImage()` download-then-persist path would apply.

---

## 2. Minty Chat — reply button disappearing

Two compounding defects, both in `components/assistant/AssistantPanel.jsx`:

### a) The Send button was literally invisible (documented anti-pattern)
The disabled/idle Send button used `background: var(--border)` + `color: var(--text-4)` — the exact combination AGENTS.md forbids (`--border` = 1.24:1, `--text-4` = 2.54:1 on the light surface). Right after an AI reply the input is empty, so the button rendered in its "invisible" state and **appeared to vanish**.

`AssistantPanel` was simply **missed by today's mobile-control-visibility pass** (`2026-09-25-mobile-control-visibility.md` covered RecipeDetailClient, ShoppingListClient, DayAgenda, DayMacroBreakdown).

### b) The input row was being clipped
Root: `height: 100%` + `maxHeight: 70vh` + `overflow: hidden`.
Messages pane: `flex: 1` + **`minHeight: 180`**.
Input row: no `flexShrink: 0`.

Flexbox maths: header 41px + messages (min 180px) + input row 64px = **285px minimum**, but `overflow: hidden` clips the bottom. Whenever the panel is height-constrained below ~285px — **which is exactly what happens when the Android keyboard opens and resizes the WebView** — the input row is clipped away entirely → "can't enter my reply".

### c) Typed replies were silently discarded
`send(input); setInput('')` ran on Enter and on the Send button. `send()` early-returns when `busy` is true, but `setInput('')` ran **unconditionally**, so any message typed while the AI was still answering was wiped.

### Fix
- Send/Mic buttons: `var(--control-action)` sizing, `var(--control-line)` borders, `--text-2` glyph — the button is now **always visible**, only the fill changes when armed.
- Messages pane `minHeight: 0` (lets it shrink) + header and input row `flexShrink: 0` → the input can never be clipped.
- `maxHeight: max(17.5rem, 70vh)` → keeps a sane floor if the Android WebView computes `vh` as 0 (the `LayoutParams` bug from `2026-09-10-webview-vh-zero-minty-chat.md`).
- New `submit()` clears the input only after the text is actually handed to `send()`.
- History now filters out card-only messages so we never send empty `content` to `/api/assistant`.

---

## 3. Nav label
`Shop` (mobile) and `Shopping` (desktop) → **`List`** on `/shopping-list`. Both tabs were renamed so the same nav item doesn't have two labels across breakpoints.

---

## Verification
- `npm run build` green (lint + types + 72 routes).
- Image pipeline proven end-to-end by a throwaway Node script (Ideogram → sharp → Supabase → public URL all PASS) before touching anything.
- Production redeploy READY; `/api/version` and `/recipes` respond 200.

## Findings

### What worked
- **Dating the regression from the database** (`image_url` kind vs `created_at`) turned "image gen is broken" into "broke between 09-09 15:34 and 09-10 07:38" in one query. Far more precise than reading code.
- **Proving the provider healthy first** (direct API probe + full pipeline script) stopped the investigation from "fixing" Ideogram when the fault was our own config.
- Vercel's env API exposes `createdAt`/`updatedAt` per variable — that is what made the key-rotation drift visible (values are encrypted and can't be compared directly).

### What didn't work
- `api.vercel.com` **hangs** under `curl.exe` without `--ssl-no-revoke`, and Node's `fetch` works fine for it. Two different network paths on this box, two different quirks.
- The `.env.local` parser regex `^([A-Z_]+)=(.*)$` silently drops **mixed-case** keys — `Vercel_token`, `Github_token`, `Supabase_token` never matched, so `Bearer undefined` → `403 invalidToken`. Use `^([A-Za-z_][A-Za-z0-9_]*)=(.*)$`.

### New knowledge
- **A rotated third-party API key must be updated in BOTH `.env.local` and the Vercel project env.** Silent SVG/emoji fallbacks hide the failure — you only see it as missing photos weeks later. Consider a server-side "image provider healthy" ping (already noted as a follow-up on 2026-09-09).
- **xAI `grok-imagine-image*` now responds in 5–14s.** The "hangs >3 min" note from 2026-09-09 is stale and should not be relied on.
- AssistantPanel needed the same control-token treatment as the rest of the app — worth grepping for `var(--border)'` on `background:` of buttons as a standing audit.

## Supersedes
- `2026-09-09-chat-recipe-options-quality.md` → its "xAI image models hang >3 min" note is **outdated** (now 5–14s). Ideogram remains the provider regardless.
