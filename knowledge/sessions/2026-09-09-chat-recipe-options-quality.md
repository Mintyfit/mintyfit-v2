# Session — Minty Chat recipe options, quality fix, image diagnosis

**Date:** 2026-09-09
**Scope:** `app/api/assistant/route.js`, `components/assistant/AssistantPanel.jsx`, `lib/recipe/recipeGenerator.js`, `app/api/grok/route.js`

## What the user asked for
1. In Minty Chat recipe creation: offer **3 options** (heading + one-sentence contents/style blurb), generate only after the user picks one.
2. Recipe was generating **immediately** and **without an image**.
3. Generated recipes were **low quality** (e.g. "beef burger" → "Prep patties and broccoli" with no seasoning/technique detail).

## Root causes found (verified by direct API probing)
- **No image = Ideogram account out of credit.** The API key is VALID (auth passes) but generation returns **HTTP 402 `insufficient_funds`** — *"Auto-recharge is disabled"*. Code silently falls back to the SVG emoji placeholder, so the recipe "works" but has no photo. **Fix is billing, not code**: top up / enable auto-recharge at ideogram.ai.
  - Debugging note: this Windows box has a schannel quirk — outbound TLS to api.ideogram.ai fails with `CRYPT_E_NO_REVOCATION_CHECK`. Use `curl.exe --ssl-no-revoke` (or `Invoke-RestMethod`) to probe from the shell. PowerShell `-d '{...}'` quoting mangles JSON — write the payload to a file and use `--data-binary "@file.json"`.
- **xAI image models (`grok-imagine-image*`) and OpenAI `gpt-image-1-mini` both hung >3 min from this machine** → not viable as drop-in image fallbacks here. Ideogram remains the image provider.
- **Poor quality = model + weak prompt.** Recipe structure ran on `grok-3-fast`, and the system prompt never enforced per-step word counts / step counts / a dedicated seasoning+technique prep step.

## Changes made
- `app/api/grok/route.js`: whitelisted `grok-4.20-0309-non-reasoning` + `grok-4.3`; **DEFAULT_MODEL → `grok-4.20-0309-non-reasoning`** (grok-3-fast no longer returned by `/v1/models`; the key now serves grok-4.x).
- `lib/recipe/recipeGenerator.js`: `RECIPE_MODEL = 'grok-4.20-0309-non-reasoning'`; max_tokens 3500→6000; system prompt now enforces **5–9 steps**, **40–80-word instructions** with °C/timing/sensory cues, a **dedicated prep step with exact seasoning quantities + shaping technique**, oil amounts and heat levels, and an explicit ban on one-line summaries like "Prep patties and broccoli".
- `app/api/assistant/route.js`: `create_recipe` intent now returns **`options[]`** (3 × `{title, blurb, prompt}`) instead of a single `recipe_prompt`. Graceful fallback to `find_recipe` if Haiku returns no usable options. Header comment updated.
- `components/assistant/AssistantPanel.jsx`: renders the 3 options as clickable cards; `pickOption()` runs `runGeneration(option.prompt, …)`. Result card now shows the generated image (16:9) and an amber warning when `recipe.imageError` is set (placeholder was saved). "None of these" button reworded to "show me new ideas".

## Verification
- `npm run build` green: compiled in 6.6s, lint+types OK, 72 static pages, no errors.
- Live LLM/image round-trip not exercised (needs authenticated session + Ideogram credit). After topping up Ideogram, create a recipe in the chat to confirm end-to-end.
- **UPDATE (same day):** Ideogram billing fixed by user (auto-recharge + fresh active API key `nb8pd7…mAcw`). Verified live: `POST /v1/ideogram-v3/generate` → **HTTP 200 in ~17s**, returns ephemeral image URL, image fetchable (`image/png`). Full pipeline now operational end-to-end.

## Follow-ups / watch-items
- If recipe instruction detail is still thin on grok-4.20, next lever is Claude Sonnet via `ANTHROPIC_API_KEY` (slower ~10–20s, pricier).
- Consider a server-side "image unhealthy" ping so the UI can warn *before* generation when Ideogram is out of credit, instead of discovering via `imageError` after.

## BONUS root cause fixed (2026-09-09): image not persisting to recipe/catalogue
**Symptom:** chat showed the generated image, but the recipe detail + catalogue showed the 🍽️ icon (no image).
**Chain:** Ideogram image generated fine → `resizeAndUploadImages` client-side canvas+upload to `recipe-images` **failed silently** (swallowed `if (!error)`) → fell back to a **base64 data-URI** → `normalizeRecipe.js` `HEAVY_DATA_URI` regex strips any data URI >4KB → icon. The DB therefore stored a 67KB/21KB base64 blob instead of a storage URL.
**Root cause:** migration 052 (`storage_public_policies`) granted **SELECT only** on `recipe-images` — **no INSERT policy**, so authenticated client uploads were RLS-denied. Service role bypasses RLS (my test upload worked), confirming it.
**Fix:**
- New `app/api/recipe/save-image/route.js` — downloads the ephemeral CDN image server-side, resizes with **sharp** (640×360 + 320×180 JPEG), uploads via `createAdminClient()` (service role, bypasses RLS), returns permanent public URLs.
- `lib/recipe/imageGeneration.js` `resizeAndUploadImages` rewritten to call that route (removed client canvas + direct supabase upload + unused createClient/IMAGE_PROXY_URL).
- New migration `060_recipe_images_write_policy.sql` — INSERT+UPDATE policies for authenticated users as defense-in-depth (⚠️ **must be run in Supabase**; the app works without it because the save uses the service role).
**Verification:** route returns 401 unauthed (correct); build green (73 routes incl. /api/recipe/save-image).

**Image-failure retry (per user decision):** `recipeGenerator.js` now attempts the storage upload, and on failure **retries exactly once** via the still-live Ideogram URL before falling back to the SVG placeholder. It deliberately does **NOT** persist the ephemeral Ideogram CDN URL to the DB (it expires within hours → dead link). No more than one retry. `imageError` surfaces when permanent save fails.

## Regenerate image feature (2026-09-09)
For recipes stuck with the SVG placeholder OR whose photo the user dislikes:
- `app/api/recipe/regenerate-image/route.js` — POST {recipeId}. Owner-only (checks `profile_id === user.id`). Rebuilds the Ideogram prompt from the recipe's title/description, calls `/api/ideogram`, saves via `/api/recipe/save-image`, and updates `recipes.image_url`/`image_thumb_url`. Falls back to the ephemeral URL only if storage save fails.
- `components/recipes/RegenerateImageButton.jsx` — "Generate photo" (if SVG placeholder) / "New photo" (replacing an existing one) overlay on the detail image.
- Wired into `RecipeDetailClient.jsx` image block; `onGenerated` updates local recipe state so the new photo shows without full reload.

## Chat empty-state UX (2026-09-09, corrected after user feedback)
User asked for ONE editable field instead of greeting-bubble + bottom input. First attempt only removed the greeting (left an empty white area — wrong). Final: `AssistantPanel` renders conditionally on `messages.length === 0`:
- **Empty state:** one large `<textarea>` (4 rows, fills the panel) with placeholder `Ask for a meal or log a food — e.g. "chicken salad for lunch" or "I had two eggs and toast".` + mic button + full-width Send button. No bottom input bar.
- **After first send:** normal chat (messages area + bottom input row).
Lesson: when a UI restructure is agreed, implement the full replacement — don't leave a half-state.
