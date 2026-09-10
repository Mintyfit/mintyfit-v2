# MintyFit Knowledge Base — Index

> Claude Code: Read this file at the start of every session to find relevant knowledge for your task. Only load files that are relevant — don't read everything.

## How This System Works

1. **Sessions** → Raw learnings captured at the end of each Claude Code session (`sessions/`)
2. **Consolidated knowledge** → Refined, deduplicated findings organized by category (`patterns/`, `anti-patterns/`, `conventions/`, `decisions/`)
3. **Hot rules** → The most critical items promoted to `CLAUDE.md` (always in context)
4. **This index** → Tells you which files exist and what they cover so you load only what's relevant

## Knowledge Files

### Patterns (what works)
| File | Covers |
|---|---|
| `patterns/data-fetching.md` | Supabase queries, caching, Server Components vs client data loading |
| `patterns/supabase.md` | RLS, auth, storage, edge functions, client init |
| `patterns/auth.md` | Auth flows, session handling, protected routes, middleware |
| `patterns/component-design.md` | Component patterns, Server vs Client Components, state management |
| `patterns/ai-integration.md` | Claude/Grok/Ideogram API patterns, prompt design, nutrition estimation |

### Anti-Patterns (what to avoid)
| File | Covers |
|---|---|
| `anti-patterns/known-pitfalls.md` | Bugs that have been hit before, things that break silently |

### Conventions (project rules)
| File | Covers |
|---|---|
| `conventions/naming.md` | File naming, variable naming, database column naming |
| `conventions/file-structure.md` | Where files go, the clean Next.js 15 App Router architecture |
| `conventions/styling.md` | CSS approach, dark mode, responsive patterns |

### Decisions (why we chose X over Y)
| File | Covers |
|---|---|
| `decisions/log.md` | Architectural Decision Records — chronological log of major decisions |

### Session Logs
| File | Summary |
|---|---|
| `sessions/2026-04-06-knowledge-system-setup.md` | Session 01 — Knowledge system and project scaffolding setup |
| `sessions/2026-04-06-business-logic.md` | Session 02 — Business logic transplant from v1; API route conversion; build verified |
| `sessions/SESSION-08-WRAPUP.md` | Sessions 03–08 — All pages built (landing, recipes, planner, shopping, menus, blog, admin, pricing, SEO) |
| `sessions/2026-04-09-session07-session09.md` | Sessions 07+09 — Statistics, Account, Family, Nutritionist; full audit; SYSTEM.md updated |
| `sessions/2026-09-01-phase0-hardening.md` | Full evaluation + MASTER-PLAN.md + Phase 0 critical fixes (Stripe tiers, GDPR, XSS, upserts, usage limits, column bugs) |
| `sessions/2026-09-02-chat-journal-planner-sync.md` | Minty Chat journal logging invisible on /plan — root cause: planner localStorage week cache; fix: shared `lib/planner/planCache.js` bust+event contract |
| `sessions/2026-09-03-sw-stale-html-hotfix.md` | Intermittent unstyled pages + /recipes "Something went wrong" — root cause: sw.js SWR-cached HTML referencing dead chunk hashes after deploys; fix: network-first pages, VERSION bump, ChunkLoadError auto-reload |
| `sessions/2026-09-03-large-file-audit-perf-fixes.md` | Large-file audit + fix-all: magnesium calc rewritten off Babel/Tailwind CDN; planner serial-await + cache-race fixes; RecipeDetail/Statistics/MyAccount memoization; 13.5MB duplicate SQL deleted; subagent bug-claim hallucination caught by source verification |
| `sessions/2026-09-03-calorie-budget-sharing-model.md` | Made `computeMealBudget` calorie-budget share the single sharing model: member toggles now recompute+persist `personal_nutrition`; Statistics per-member cards use calorie-budget split (was equal-split); menus/apply stores budget not raw totals; AGENTS.md data-flow rewritten |
| `sessions/2026-09-03-photo-food-logging.md` | Photo food logging (Family tier only): `/api/food-photo` Haiku vision route, decompose-then-sum prompt, editable component grams in JournalEntryForm. CRITICAL env findings: `next build` spawn UNKNOWN / 0xC0000409 = Windows commit exhaustion → `experimental.cpus: 1` workaround; junction+npm ci wiped main node_modules |
| `sessions/2026-09-07-dark-mode-tokens.md` | /pricing cards + FAQ invisible in dark mode — root cause: non-existent CSS vars (`--text-primary`/`--card-bg`/etc.) silently falling back to light hex; renamed to real tokens (`--text-1..4`, `--bg-card`, `--border`) across pricing + blog files |
| `sessions/2026-09-07-app-shell-sw-cache-removal.md` | Android app shell served stale pre-chat UI after login — root cause: SW cache layer in installed WebView (3rd SW incident); fix: service worker cache REMOVED entirely (self-purging sw.js + ServiceWorkerCleanup), AGENTS.md rule added; bonus: explicit root font-size fixes too-small text (WebView default ~14px) |
| `sessions/2026-09-09-chat-recipe-options-quality.md` | Minty Chat create_recipe now offers 3 option cards (title+blurb+prompt) before generating; quality fix = model grok-3-fast→grok-4.20-0309-non-reasoning + prompt enforces 5–9 steps/40–80-word instructions/seasoning-prep step; NO-IMAGE root cause = Ideogram HTTP 402 insufficient_funds (billing, not code); Windows schannel TLS quirk → curl --ssl-no-revoke + --data-binary @file |
| `sessions/2026-09-09-recipe-chat-adjust-with-ai.md` | "Adjust with AI" chat on the recipe page: `/api/recipe/edit` (Haiku rewrite, preview→apply, owner edits in place / non-owner single private "(My Version)" fork via `forked_from_id`, nutrition re-estimated) + `RecipeChatPanel`; recipe image moved under heading on mobile only (`hide/show-mobile-780` helpers); NOTE existing `/api/recipe/fork` route is stale/broken (wrong columns) |
| `sessions/2026-09-09-perf-loading-cache-pass.md` | Site-wide perf pass: segment loading.jsx skeletons (root loading.jsx does NOT re-show on nav); recipe detail via `unstable_cache` public fast path (repeat ~0.03s) + React cache() dedupe + members moved client-side (`members:` SWR cache); /plan SSR parallelized; middleware anon fast path; revalidateTag('recipes') contract; Elastic rejected as wrong tool |
| `sessions/2026-09-09-recipe-layout-webview-refresh.md` | Recipe detail: single image under heading + intro shown once (`intro \|\| description`); catalogue-stale-image fix: revalidateTag does NOT bust time-based ISR pages — need `revalidatePath('/recipes')` too; dark-mode white-on-white button; WebView stale-layout self-heal via `/api/version` + `DeploymentCheck` cache-bust reload; Minty Chat paywall race (paid user saw "Upgrade") — profile loads async after user, gate teaser until tier known |
| `sessions/2026-09-10-app-staleness-selfheal-deploy.md` | App showed pre-chat UI w/ fresh recipe data (data fresh + UI stale = stale JS bundle) — root cause: self-heal commit `d1e0545` unpushed; pushed + verified `/api/version` live. Key rule: freshness self-heal only protects builds CONTAINING it — deploy immediately + one manual cache clear for stuck devices. Navbar mobile drawer no longer hides under bottom nav (uncommitted) |
| `sessions/2026-09-10-regenerate-image-self-fetch-fix.md` | Recipe page "Image provider returned no URL" — root cause: regenerate-image route self-fetched its own `/api/ideogram` with forwarded cookies; any inner failure surfaced opaquely. Fix: extracted `lib/recipe/ideogramServer.js` + `saveRecipeImageServer.js`; routes are thin wrappers; regenerate calls libs in-process and returns the REAL provider error. Rule: never self-fetch your own API route from a route handler |

### Prompts
| File | Purpose |
|---|---|
| `prompts/session-wrap.md` | Template prompt for end-of-session knowledge capture |
| `prompts/consolidate.md` | Template prompt for weekly consolidation pass |
| `prompts/cross-project.md` | Template for extracting cross-project learnings |
