# Session: 2026-09-01 — Evaluation + Phase 0 Hardening

## What happened
Full codebase evaluation (UX 6/10, code 6/10, architecture 5.5/10) → MASTER-PLAN.md created (5 phases: critical fixes, perf/caching, mobile typography, voice assistant, consolidation) → Phase 0 executed completely. Build passes.

## Verified critical bugs found & fixed (all spot-checked in source)
1. **Managed members invisible**: code selected `weight_kg`/`height_cm` from `managed_members`/`profiles` — columns never existed (schema has `weight`/`height`, migrations 027/043). PostgREST 400 → silent empty arrays. Fixed in plan/statistics/recipes pages + RecipeDetailClient.
2. **Stripe tier 'paid'**: webhook wrote `subscription_tier='paid'`; consumers expect pro/family → paying users got free limits. Fixed via `tierFromSubscription()` (plan_id metadata → price-ID fallback). **Requires edge function redeploy.**
3. **GDPR broken**: referenced non-existent `journal_entries` + `meal_plans` tables; deleted calendar by `member_id` (NULL on new rows); recipes query used non-existent `created_by` column. Rewrote both routes; managed children now reassign to surviving family member on account deletion.
4. **Stored XSS**: BlogContent raw innerHTML + deliberate script re-execution; pages/[slug] raw CMS HTML. Fixed via new `components/shared/SafeHtml.jsx` (isomorphic-dompurify) — now the ONLY sanitization site.
5. **Upsert 42P10**: onConflict targeted partial unique index (049). Replaced with select→insert/update in PlannerClient + menus/apply. Errors now surface via alert (toast = Phase 4).
6. **Client-side usage limits**: racy + bypassable. New migration 058 (atomic `usage_check_and_increment` RPC + `ai_calls` column); proxies now meter by whitelisted `purpose`, fixed model lists, capped max_tokens, 429 LIMIT_REACHED. **Requires running migration 058** (fails open until then).

## Patterns worth remembering
- **This codebase's silent-failure mode**: PostgREST 400s swallowed by `?? null` / empty catches. Any new select should log or surface errors during dev.
- **Read-tool artifact**: garbled displays like `console.error('[menus/apply POST144:` or `catch) {` were tool artifacts, not real file corruption. Verify in raw source before "fixing".
- **Naive substring dead-code checks false-positive** (e.g. "family" matches everywhere). Use precise import-path greps.
- `db-transfer/` contains a second divergent schema copy + data dumps — schema drift hazard; do not trust it as schema source.
- Kimi API has NO ASR/TTS (per Moonshot docs) — voice STT → Groq Whisper planned; Kimi K2 remains a valid text-brain option (OpenAI-compatible).

## Files changed
- Modified: app/plan/page.jsx, app/statistics/page.jsx, app/recipes/[slug]/page.jsx, components/recipes/RecipeDetailClient.jsx, supabase/functions/stripe-webhook/index.ts, lib/usageLimits.js, components/account/MyAccountClient.jsx, app/api/gdpr/{export,delete}/route.js, components/blog/BlogContent.jsx, app/pages/[slug]/page.jsx, components/planner/PlannerClient.jsx, app/api/menus/apply/route.js, app/api/{claude,grok}/route.js, lib/recipe/{recipeGenerator,ingredientSwap,ingredientDatabase}.js, lib/nutrition/{nutrition,usdaNutrition}.js, components/planner/JournalEntryForm.jsx, components/statistics/StatisticsClient.jsx, components/recipes/RecipeGeneratorClient.jsx, components/landing/AuthModal.jsx, lib/supabase/client.js, app/api/nutritionist/connect/route.js, middleware.js, .env.local
- Created: MASTER-PLAN.md, components/shared/SafeHtml.jsx, supabase/migrations/058_usage_check_and_increment.sql
- Deleted: AppNav, ThemeToggle, useFamily, useStorage, syncFamily, promotions.js, FamilySection, MemberCard, MeasurementForm, SubscriptionCard, api/account/{family,measurements}, empty dirs (components/auth, components/home, mobile)
- Deps added: isomorphic-dompurify

## Next session
Phase 1 (wrapper fixes at D:\WORKS\Minty\Android + PWA + useCachedData) or Phase 2 (root font scaling — quickest user-visible win: one CSS rule). User priorities: app performance, mobile text size, then voice assistant (paid feature).

---

## Addendum — same day: Phases 1–3 + 4.2 executed (build green after each)

**Phase 1 (perf):** Android wrapper fixed (double-load, configChanges, mic permission flow for WebView getUserMedia, file chooser). PWA: manifest.json (was missing) + sw.js (never caches authed HTML/api) + registrar. useCachedData.js (localStorage SWR + invalidation events) wired into RecipesClient (fixes stale private-recipe cache) + PlannerClient (sessionStorage→localStorage 30min TTL). Statistics: 50-recipe×47-nutrient catalogue removed from SSR → lazy on AI-analysis click.

**Phase 2 (mobile type):** root font scaling (17.5px ≤767px, 18px ≤380px) + --text-xs…2xl tokens + px→rem in SwapPopup/RecipeDetailClient + touch targets (44px arrows, 40px buttons, 12px nav labels) + planner day-first on mobile (CSS order swap).

**Phase 3 (voice assistant, paid):** /api/transcribe (Groq Whisper), /api/assistant (Haiku intent → FTS+rerank / create / log_food via Grok / question), useVoiceInput.js (WebSpeech→MediaRecorder fallback), AssistantPanel + AssistantFab, mounted on /recipes + /plan. Gated by canUseVoiceAssistant both server (403 UPGRADE_REQUIRED) and client (teaser → /pricing).

**Phase 4.2:** extractJSON 8→1 (lib/utils/extractJSON.js, kept the depth-tracking variant — naive version would've been a regression), MEAL_TYPES 9→1 (+RECIPE_MEAL_TYPES for the 4-slot recipe vocabulary), toDateKey 4→1.

## New pitfalls learned
- **Never call setState with side effects inside another setState updater** (React StrictMode double-invokes updaters → would double-send voice messages). Caught in AssistantPanel before shipping.
- **PowerShell `-replace` with quotes is dangerous** for source edits — use literal `.Replace()` or the edit tool.
- Read-tool occasionally mangles displayed code (`console.error('[menus/apply POST144:` etc.) — always verify in raw source before "fixing" phantom syntax errors. One real artifact-induced edit had to be repaired (extra `}` in transcribe route) — caught by build.
- Kimi API has NO ASR (official docs) → Groq Whisper chosen; Kimi K2 remains a valid OpenAI-compatible text brain if desired later.

## Manual steps pending
Website: migrations 058+059 in Supabase, `supabase functions deploy stripe-webhook`, GROQ_API_KEY in Vercel. Android: Gradle rebuild + device test (rotation, mic, voice).

---

## Addendum 2 — same day: Phase 4 remainder executed (build green)

**4.3 lint**: `ignoreDuringBuilds` removed — build passes with lint enabled (codebase was already lint-clean).

**4.5 primitives**: `components/ui/{Toast,Modal,ConfirmDialog}.jsx` — ToastProvider/ConfirmProvider wired in layout. **All 24 alert()/confirm() call sites replaced** across PlannerClient, MyFamilyClient, MyAccountClient, PricingClient, NutritionistClient, AdminClient, BlogEditorClient, ShoppingListClient, onboarding, useVoice.

**4.1 decomposition (partial)**: RecipeDetailClient 2,208→1,725 lines — extracted NutritionDelta/IngredientAlternativesSheet/DonutChart/NutritionSection/SidebarNutrition + helpers to `components/recipes/RecipeNutrition.jsx`. ⚠️ **NutritionSection is dead code** (defined, never rendered) — the "progressive nutrition disclosure" feature from Session 04 apparently regressed; decide to wire or delete.

**4.4 smoke tests**: `scripts/smoke-test.mjs` — 6 flow checks against staging (schema, managed-member round-trip, calendar save, RPC guard, tier vocabulary, FTS).

**4.1b PlannerClient split (done same day)**: 1,210→943 lines. `components/planner/PlannerSidebar.jsx` owns sidebar state/search/filter/pagination/menus tab; drag initiation crosses the boundary via props (`onRecipeDragStart` etc. — refs stay in parent because drop resolution lives there). `plannerConstants.js` holds PlannerClient's SVG MEAL_ICONS + MEAL_LABELS. ⚠️ Emoji MEAL_ICONS in DayMacroBreakdown/MonthView/WeekOverview are a separate intentional variant — not unified.

## Bonus live bugs found & fixed in Phase 4
- **GDPR delete button called POST** — route only accepts DELETE. The "Delete account" button silently did nothing. (MyAccountClient + dead ProfileSection both had it.)
- Dead: ProfileSection.jsx, NutritionistLinkStatus.jsx (no importers — deleted).

## New pitfalls learned (2)
- **PowerShell backtick is the escape char** — a `.Replace()` with template literals silently corrupted two lines into `PLACEHOLDER` markers in MyFamilyClient. Caught and repaired. Lesson: NEVER use PowerShell string surgery for anything containing backticks or `$`; prefer the edit tool for code.
- Check `window.confirm` variants too, not just bare `confirm(`.
