# MintyFit v2 — Master Plan: Hardening + Voice-First Mobile Experience

> Created 2026-09-01 after full codebase evaluation (UX 6/10, code quality 6/10, architecture 5.5/10).
> This file is the TASK-REFERENCE for the new work. Track status in CHECKPOINT.md (Session 10+).
> Rule: a task is DONE only when its verification criterion is demonstrated.

---

## Strategic Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Rebuild vs fix | **Fix forward, no rebuild** | Architecture is sound; bugs are surgical |
| Assistant STT | **Groq Whisper** (`whisper-large-v3-turbo`, ~$0.04/h audio, OpenAI-compatible) | Kimi API has **no ASR** (confirmed in Moonshot docs). Groq ≠ Grok/xAI — different company |
| Assistant brain (text) | **Claude Haiku** via existing `/api/claude` (model-agnostic design; Kimi K2 swappable later — OpenAI-compatible) | Already integrated, no new dependency |
| Recipe search | **Hybrid: Postgres FTS + LLM rerank** | User-selected. pgvector deferred (documented upgrade path) |
| Voice assistant gating | **Paid feature** (pro/family tiers only) | STT + LLM cost per use; free tier keeps typed search |
| Schema fix direction (0.1) | **Fix code to match schema** (`weight`/`height` per migrations 027/043) | One naming convention; works regardless of prod drift |
| Mobile typography | Root font-size scaling first, tokens as touched | 2,182 inline rem styles scale with one CSS rule |

---

## PHASE 0 — Critical Bug Fixes (2–3 days)

### 0.1 Managed members invisible (core feature broken)
**Bug:** Code selects `weight_kg`/`height_cm` from `managed_members` (has `weight`/`height` only, migration 027) and from `profiles` (has `weight`/`height`, migration 043). PostgREST returns 400 → silently empty arrays. Managed children never load on /plan, /statistics, /recipes/[slug].
**Fix:** Change selects to `weight, height`; mappings to `m.weight ?? null`.
**Files:** `app/plan/page.jsx` (~L100, L132-133, L187, L219-220), `app/statistics/page.jsx` (L32, L83, L88, L101-102, L112-113, L127-128), `app/recipes/[slug]/page.jsx` (L117, L148-149), `components/recipes/RecipeDetailClient.jsx` (~L606).
**Verify:** Managed child appears in member pickers on all three pages.

### 0.2 Paid tier never activates (monetization broken)
**Bug:** Webhook writes `subscription_tier='paid'`; consumers expect `pro`/`family`. Result: paying customers keep free limits.
**Fix:**
- `supabase/functions/stripe-webhook/index.ts`: map Stripe price ID → `pro`/`family` via env price IDs (replace `'paid'`).
- `lib/usageLimits.js`: add `family: PAID_LIMITS` (keep `nutritionist` alias).
- Reconcile free limit: single source in `lib/stripe.js` `FREE_LIMITS` (5/day), `usageLimits.js` derives from it.
- `components/account/MyAccountClient.jsx`: portal link GET→POST (fetch, not `<a href>`).
**Verify:** Webhook event → profile tier = pro/family → limits lift; portal opens.

### 0.3 GDPR export/delete broken (legal liability)
**Bug:** References non-existent `journal_entries` table; deletes calendar by `member_id` (new rows have NULL); never deletes `recipes`, `daily_usage`, `shopping_lists`, `recipe_member_states`, `recipe_ingredient_swaps`.
**Fix:** `app/api/gdpr/export/route.js` + `delete/route.js`: `journal_entries`→`food_journal`; calendar/journal keyed by `profile_id`; add all owned tables. Delete order: children before parents.
**Verify:** Export contains journal + recipes; after delete, zero rows in every user-data table.

### 0.4 Stored XSS (security)
**Bug:** `components/blog/BlogContent.jsx:76` raw `dangerouslySetInnerHTML` + script re-execution (L48-53); `app/pages/[slug]/page.jsx:145` raw CMS HTML. DOMPurify installed, never imported.
**Fix:** Add `isomorphic-dompurify` (SSR-safe). New `components/shared/SafeHtml.jsx` — the ONLY allowed `dangerouslySetInnerHTML` site. Config: allow iframes with sandbox, strip scripts. BlogContent + pages/[slug] migrate to it. Calculator embeds continue via iframe path (BlogCalculatorEmbed markers), scripts stripped.
**Verify:** `<script>alert(1)</script>` in a blog post renders inert; calculator embeds still render.

### 0.5 Silent calendar upsert failures (data loss)
**Bug:** `onConflict: 'family_id,date_str,meal_type,recipe_id,origin'` targets a PARTIAL unique index (migration 049, `WHERE family_id IS NOT NULL`) → Postgres 42P10; error swallowed by console.error.
**Fix (code-first, no migration dependency):** replace upsert with select→update-or-insert in `PlannerClient.jsx` (~L517) and `app/api/menus/apply/route.js` (~L133); surface failures to user (error state, not console).
**Follow-up migration (optional hardening):** generated column `owner_key uuid GENERATED ALWAYS AS (COALESCE(family_id, profile_id)) STORED` + non-partial unique index on `(owner_key, date_str, meal_type, recipe_id, origin)`; then restore simple upsert with new target. Mark clearly: **requires user to run migration in Supabase**.
**Verify:** Add same recipe to same slot twice → no duplicates, no console errors; failure shows toast.

### 0.6 Client-side usage limits (revenue protection + AI cost control)
**Bug:** `checkAndIncrementUsage` runs in browser, read-then-upsert race; `/api/grok` accepts arbitrary `model`/`max_tokens`; AI proxies unmetered.
**Fix:**
- Migration: `usage_check_and_increment(p_user_id uuid, p_type text, p_limit int)` SQL function — atomic `INSERT ... ON CONFLICT (user_id, date) DO UPDATE ... RETURNING` — returns allowed/current/limit.
- `/api/claude/route.js` + `/api/grok/route.js`: accept whitelisted `purpose` enum (`recipe-generation`, `nutrition-estimate`, `food-parse`, `ingredient-swap`, `assistant`, `transcribe`); fixed model server-side (ignore client `model`); call RPC for metered purposes; 429 `{ error: 'LIMIT_REACHED', limit }`.
- `lib/recipe/recipeGenerator.js`: pass `purpose: 'recipe-generation'`; drop client-side check (server authoritative).
- New `lib/tierEntitlements.js`: single source — `canUseVoiceAssistant(tier)`, `getLimits(tier)` re-export; voice = pro/family only.
**Verify:** Free user over cap → server 429 (also via direct API call); arbitrary model param ignored.

### 0.7 Middleware + hygiene
**Fix:**
- `middleware.js` PROTECTED_PATHS: `/plan`, `/statistics`, `/my-account`, `/my-family`, `/shopping-list`, `/nutritionist` (current list guards non-existent routes).
- Delete dead code: `components/shared/AppNav.jsx`, `hooks/useFamily.js`, `hooks/useStorage.js`, `lib/member/syncFamily.js`, `lib/promotions.js`, `components/account/FamilySection.jsx`+`MemberCard.jsx` (verify no importers first), `app/api/account/family/`, `app/api/account/measurements/`, empty dirs (`components/auth/`, `components/home/`, `mobile/`).
- Remove debug `console.log`s: `components/landing/AuthModal.jsx` (logs env values — security), `lib/supabase/client.js`, `app/api/nutritionist/connect/route.js`.
- `lib/nutrition/usdaNutrition.js`: hardcoded API key → `process.env.NEXT_PUBLIC_USDA_API_KEY ?? 'DEMO_KEY'` (verify client/server usage first).
- Remove duplicated `computeBMR` in `components/statistics/StatisticsClient.jsx` and `components/account/MeasurementForm.jsx` → import from `lib/nutrition/portionCalc.js`.
**Verify:** Build passes; grep finds zero importers of deleted files; no console.log of env/URLs.

---

## PHASE 1 — Performance & Caching (3–4 days)

### 1.1 Android wrapper fixes (`D:\WORKS\Minty\Android`)
- Remove double `loadUrl` (factory + LaunchedEffect).
- `android:configChanges="orientation|screenSize|keyboardHidden"` on MainActivity + `WebView.saveState/restoreState`.
- Add `RECORD_AUDIO` permission; `WebChromeClient.onPermissionRequest` granting `RESOURCE_AUDIO_CAPTURE` for mintyfit.com origin (**prerequisite for Phase 3**); `onShowFileChooser` for file inputs.
- Add `androidx.webkit` dependency.
**Verify:** Rotation preserves page state; mic permission grantable; single page load on start (check logcat/network).

### 1.2 PWA + service worker (website; benefits app — WebView allows SW by default)
- Create real `public/manifest.json` (currently referenced in layout.jsx but missing) + icons.
- `public/sw.js`: app shell + fonts (cache-first immutable); `/recipes`, `/menus` HTML (stale-while-revalidate); Supabase storage images (cache-first, 30d, max entries). Registration gated to production.
**Verify:** DevTools offline → /recipes renders; repeat visits paint instantly.

### 1.3 Client data-cache layer
- New `hooks/useCachedData.js`: localStorage + TTL + stale-while-revalidate + `window.dispatchEvent` invalidation (`recipes:changed`, `plan:changed`, `journal:changed`).
- Apply to: StatisticsClient (initialData), PlannerClient week cache (upgrade sessionStorage→localStorage w/ TTL), RecipesClient private merge (add invalidation on recipe save — fixes existing staleness bug).
**Verify:** Statistics revisit = instant paint + background refresh shimmer; new recipe appears in list without manual refresh.

### 1.4 Statistics slimming (only if still slow after 1.3)
- Server-side per-day aggregate (SQL or materialized); ship aggregates, not 60 days of raw entries.

---

## PHASE 2 — Mobile Typography & Portrait UX (2–3 days)

- **2.1** Root font scaling: `@media (max-width:767px){ html{font-size:17.5px} }`, `@media (max-width:380px){ html{font-size:18px} }` in globals.css. Scales ~90% of text (rem-based) +9–12%.
- **2.2** px→rem audit: SwapPopup, RecipeDetailClient, StatisticsClient raw `fontSize: 11/12/13` px → rem.
- **2.3** Touch targets ≥44px: week-nav arrows, sidebar "+", member chips, bottom-nav tabs, ingredient checkboxes.
- **2.4** Typography tokens `--text-xs…--text-xl` in globals.css; new code uses tokens only.
- **2.5** Portrait planner: day view as mobile default; week collapses to horizontal day strip; pickers become bottom sheets.
**Verify:** No text <12px on mobile; body text ≥14.5px; all tappables ≥44px (inspect); planner one-handed usable.

---

## PHASE 3 — Voice Assistant "Minty Chat" (5–7 days) — PAID FEATURE

**Entitlement:** `tierEntitlements.canUseVoiceAssistant(tier)` → pro/family only. Free users see typed search + locked mic button with upgrade prompt (link to /pricing — also fixes the dead-end upsell).

### 3.1 STT pipeline
- `POST /api/transcribe`: auth → entitlement check → RPC usage meter (`transcribe` purpose) → Groq Whisper `whisper-large-v3-turbo` (`GROQ_API_KEY` env) → `{ text }`. Max 60s audio, webm/opus.
- `hooks/useVoiceInput.js` (replaces useVoice.js): MediaRecorder primary; Web Speech API free fallback in supporting browsers; language from profile; no `alert()`s.

### 3.2 Assistant brain — `POST /api/assistant`
- One structured-output Haiku call: `{ intent: find_recipe|create_recipe|log_food|question, entities }`.
- **find_recipe:** migration adds `search_vector tsvector` (title+description+ingredient names+cuisine) + GIN index + trigger; FTS top-20 → LLM rerank with one-line reasons.
- **create_recipe:** hands refined prompt to existing recipeGenerator pipeline → preview card in chat.
- **log_food (3b):** existing Grok parse → confirm card (items/amounts/member/meal) → save to food_journal.
- Server stateless; client keeps last N messages.

### 3.3 Chat UI — `components/assistant/`
- `AssistantPanel`: message list, mic button (idle/listening/thinking), typed fallback (a11y), action cards reusing RecipeCard (View / Add to plan / Create new instead).
- Entry points: /recipes (search bar becomes chat), planner day view, journal tab.
- Optional TTS replies (existing speechSynthesis), off by default.

**Verify (demo script):** "I want a chicken salad" → ≥3 matches + reasons + create-new button → "no mayo" → generation starts. Journal: "two eggs and toast for breakfast" → confirm card → entry in day totals. Free user: mic shows lock → /pricing.

### 3.4 Migration note
`search_vector` migration + usage RPC migration must be run in Supabase by user (documented in CHECKPOINT).

---

## PHASE 4 — Consolidation (ongoing, parallel)

- Decompose `RecipeDetailClient.jsx` (2,204 lines → ~6 components + `useRecipeScaling`), `PlannerClient.jsx` prop drilling.
- Single `extractJSON`/`toDateKey`/`MEAL_TYPES` in lib/; remove 7×/16×/8× duplications.
- `eslint.ignoreDuringBuilds` → false; fix surfaced issues.
- Inline styles → Tailwind/tokens per-screen as touched; fix dark-mode var names (`--text-primary`→`--text-1` etc.) on blog/pricing/pages.
- Smoke-test script (staging Supabase): family create → managed kid visible → plan save → stats render → tier upgrade → GDPR delete.
- Primitives: Modal (focus trap), ConfirmDialog, Toast, FormField — replace `alert()`/`confirm()`.

---

## Env Var Additions (update SYSTEM.md when landing)

```
GROQ_API_KEY=...            # server-side, Whisper STT (Phase 3)
NEXT_PUBLIC_USDA_API_KEY=... # replaces hardcoded key (Phase 0.7)
```

## Out of scope (documented, deferred)

- pgvector semantic search (hybrid FTS chosen; revisit if recall complaints)
- Native Android SpeechRecognizer bridge (server STT chosen; wrapper keeps option open)
- iOS wrapper (Android first)
- Full Tailwind migration (per-screen opportunistic)
