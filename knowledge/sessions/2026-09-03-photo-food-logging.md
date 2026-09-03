# Session — 2026-09-03 — Photo Food Logging (Family tier) + Windows build-env landmines

## Feature: Photo food logging
- User asked how to make free-text food entries ("chinese chicken with red sauce and rice, ~500g") more accurate, then approved: **photo option gated to the most expensive plan = `family` ($7.99/mo)**.
- Accuracy design (per discussion): **decompose-then-sum beats blended estimate**; photo fixes portion-size + component-ratio guessing; editable component grams on the confirm screen fixes the dominant residual error without another API call.

### What was built
- `app/api/food-photo/route.js` (NEW) — Haiku vision route. Chain: auth 401 → `canUsePhotoFoodLog(tier)` 403 (family only) → `enforceUsageLimit('food-parse')` 429 → Anthropic vision call. Prompt: identify components → estimate grams each using plate/utensils as size reference → full 53-field nutrition per component (template from `EMPTY_NUTRITION`). Server `pickNutritionFields` per component; rejects empty result with 422 `NO_FOOD_DETECTED`. Body validated: 4 media types, 7M base64-char cap (Anthropic 5MB/image limit).
- `lib/usageLimits.js` — added `PHOTO_FOOD_LOG_TIERS = ['family']` + `canUsePhotoFoodLog(tier)` (mirrors `canUseVoiceAssistant` pattern).
- `hooks/useSubscription.js` — now also returns `isFamily`, `canUsePhotoLog`.
- `components/planner/JournalEntryForm.jsx` — 4th tab "📸 Photo". Non-family: paywall teaser + Link to /pricing (AssistantPanel pattern). Family: file input (`capture="environment"`) → client-side downscale to 1024px JPEG via canvas (`fileToResizedDataUrl`, ~150-400KB) → optional text hint → analyse → confirm screen lists components with **editable grams inputs** (linear nutrient rescale, totals re-derive via `sumNutrition`) → save to `food_journal` via existing `saveEntry`.
- Pricing copy: "Photo food logging (AI vision)" added to Family features in `lib/stripe.js` PLANS + `components/landing/PricingToggle.jsx` FAMILY_FEATURES.
- SYSTEM.md stack table updated.

### Verification
- `npx next build` green (EXIT=0), `/api/food-photo` in route table — but ONLY with the `cpus: 1` workaround below.
- Dev-server smoke test: POST without session → **401** (route + auth gate live at runtime).

## CRITICAL ENVIRONMENT FINDINGS (this machine)

### 1. `spawn UNKNOWN` / worker exit 3221226505 (0xC0000409) / 2147483651 (0x80000003) during `next build`
- **Root cause: system commit charge exhaustion.** `\Memory\Committed Bytes` was 29.7GB / 31.7GB limit (~2GB headroom, pagefile ~0). Node 24 static-gen workers abort at `InitializeOncePerProcessInternal` → `ncrypto::CSPRNG` assert → `VirtualAlloc failed` — before any app code runs.
- **Symptoms mislead**: plain `node fork()` works fine; "Collecting page data" passes; only "Generating static pages (0/N)" dies. Exit codes vary run to run (0xC0000409 vs 0x80000003).
- **Workaround: `experimental: { cpus: 1 }` in next.config.mjs** → single worker → build passes (verified on HEAD and on the feature branch). Apply temporarily, revert after (`git checkout -- next.config.mjs`).
- **Do NOT "fix" code for this** — HEAD (known-green) failed identically. If build dies at 0 pages with spawn/exit-code errors, check commit charge first: `Get-Counter '\Memory\Committed Bytes','\Memory\Commit Limit'`.

### 2. Junction + `npm ci` = deleted the MAIN repo's node_modules
- Created `node_modules` as a **junction** in a temp clone pointing at the real repo; `npm ci` in the clone followed the junction and wiped the TARGET (main repo node_modules = 0 packages). Then `npx next build` silently fell back to downloading **Next 16.3.4 (Turbopack)** and failed confusingly ("Could not find the Next.js package").
- **Rules**: never junction/symlink node_modules into a temp copy on Windows; if `npx next build` ever reports a different Next version than package.json (15.5.14), suspect broken node_modules first; recovery is `npm ci --prefer-offline` (~30s with warm cache).

## Files changed
- NEW: `app/api/food-photo/route.js`
- M: `components/planner/JournalEntryForm.jsx`, `hooks/useSubscription.js`, `lib/usageLimits.js`, `lib/stripe.js`, `components/landing/PricingToggle.jsx`, `SYSTEM.md`
