# MintyFit v2 — System Documentation

> **AUTO-UPDATE:** Claude Code must update this file after any task that changes the database schema, adds/removes utility files or components, modifies the nutrition data flow, adds features, or changes environment variables. See `CLAUDE.md` for the full checklist. Sections marked with 🔄 need updates most often.

---

## What is MintyFit?

MintyFit (mintyfit.com) is a family nutrition and meal planning platform. Users generate AI-powered recipes, track 47+ micronutrients with personal targets based on each family member's body parameters, plan weekly meals with calorie-budgeted meal distribution, log food via manual entry, AI description, or barcode scan, and review nutrition history in Statistics.

Operated under Smart Diet OÜ (Estonia). Deployed on Vercel. Database on Supabase.

**v2 is a clean rebuild** — pure Next.js 15 App Router, no Vite, no React Router DOM, no SPA bridge layer.

---

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 App Router | Server Components by default; `'use client'` only when needed |
| Frontend | React 19 | Tailwind CSS v4 for styling |
| Routing | Next.js file-based routing | No React Router DOM |
| Icons | Lucide React | |
| XSS protection | DOMPurify | Client components only |
| Backend / DB / Auth | Supabase (PostgreSQL + Auth + Storage) | RLS on all tables |
| Supabase client | `@supabase/ssr` | `createBrowserClient` (browser), `createServerClient` (SSR/RSC) |
| AI recipes | Claude Haiku via `/api/claude` Route Handler | `claude-haiku-4-5-20251001` |
| AI food lookup | Grok via `/api/grok` Route Handler | Journal nutrition estimation |
| AI images | Ideogram via `/api/ideogram` Route Handler | |
| Payments | Stripe | Checkout + portal via Supabase Edge Functions |
| Deployment | Vercel | Route Handlers + Server Components |

---

## 🔄 Nutrition Data Flow (Core Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│ 3. SINGLE RECIPE VIEW                                       │
│    User selects family members + meals per day (3/4/5)     │
│    → Each member gets personal meal target:                 │
│      dailyTarget × mealWeight (normalized over day's meals) │
│    → familyMealTarget = Σ personMealTargets                 │
│    → batchScale = familyMealTarget / recipeTotals.kcal      │
│    → personShare = personMealTarget / familyMealTarget      │
│    → personNutrition = recipeTotals × batchScale × share    │
│    → Ingredient amounts scaled by combinedFraction          │
│    → RDA% bars show personal targets from memberRDA.js      │
│    Source: lib/nutrition/mealBudget.js (meal distribution)  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 4. CALENDAR (calendar_entries table)                        │
│    Recipe added to plan → one row per entry saved           │
│    Entry: consumer_member_ids + personal_nutrition (JSONB)  │
│    personal_nutrition = recipeTotals × batchScale           │
│    (combined nutrition for all eaters, IMMUTABLE)           │
│                                                             │
│    Journal entries → food_journal table                     │
│    Each entry: member_id + nutrition (exact amount eaten)   │
│    No scaling — journal is a fact, not a plan               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 5. PLAN SIDEBAR / STATISTICS                                │
│    Reads entries with recipe join (preferred) or            │
│    personal_nutrition fallback.                             │
│    Recomputes per-member breakdown via meal budget model    │
│    (personMealTarget / familyMealTarget).                   │
│    Compares daily consumed against daily targets from       │
│    computeMemberDailyNeeds().                                │
│    Does NOT divide daily targets by meal count.             │
│    Flags deficiencies (<70%) and excesses (>150%)           │
└─────────────────────────────────────────────────────────────┘
```

**Single source of truth:** BMR computed in `portionCalc.js`. Daily targets in `memberRDA.js`. Meal budget distribution in `mealBudget.js`. Nutrition is calculated at save time using the meal budget model; reads can recompute per-member breakdown using the same model.

---

## 🔄 Key Utility Files

| File | Purpose |
|---|---|
| `lib/nutrition/portionCalc.js` | `computeBMR()`, `computeTDEE()`, `computeFamilyBMI()`, `getMemberBMIFraction()`, `getMemberActivityFactor()`, `computeMemberNutrition()` — SINGLE SOURCE OF TRUTH for BMR and BMI fraction (used only for legacy fallback now) |
| `lib/nutrition/mealBudget.js` | `computeMealBudget()`, `computeMealBudgetDayBreakdown()`, `computeMealBudgetDayNutrition()`, `getMealWeight()`, `getPersonMealTarget()` — SINGLE SOURCE OF TRUTH for meal budget/portion calculation. Replaces BMI fraction scaling for all new entries. |
| `lib/nutrition/memberRDA.js` | `computeMemberDailyNeeds(member)` — 47 personal daily nutrient targets. Metabolic-health focused (low carb, higher protein) |
| `lib/nutrition/nutrition.js` | `NUTRITION_FIELDS` array (47 nutrients), `getNutritionData()`, `scaleNutrition()`, `sumNutrition()` |
| `lib/member/syncFamily.js` | `syncFamilyMembers(userId)` — loads family from Supabase with measurements, computes BMR/TDEE |
| `lib/member/enrichMember.js` | `enrichMember(m)` — computes baseDailyCalories, falls back to age/gender estimates when weight/height missing. Single source of truth — NOT duplicated in pages/components. |
| `lib/recipe/recipeGenerator.js` | Full recipe generation pipeline: Claude → nutrition → image → save |
| `lib/recipe/ingredientDatabase.js` | Central ingredient lookup: Supabase → USDA → Claude Haiku fallback |
| `lib/recipe/imageGeneration.js` | Ideogram image generation + Supabase Storage upload |
| `lib/recipe/ingredientSwap.js` | AI-powered ingredient substitution |
| `lib/journal/openFoodFacts.js` | `lookupBarcode()` — barcode scan product lookup + nutrient mapping |
| `lib/nutrition/usdaLookup.js` | USDA FoodData Central API wrapper |
| `lib/usageLimits.js` | `checkAndIncrementUsage()` — rate limiting per tier |
| `lib/stripe.js` | Stripe plan config, `FREE_LIMITS`, price IDs |
| `lib/supabase/client.js` | Browser Supabase client (singleton, `createBrowserClient`) |
| `lib/supabase/server.js` | Server Supabase clients: cookie-based SSR, public/ISR, admin |

---

## 🔄 Repository Structure

```
AprillBuild/
├── app/                              # Next.js App Router
│   ├── page.jsx                      # Home page (Server Component)
│   ├── layout.jsx                    # Root layout, AuthProvider
│   ├── globals.css                   # Tailwind + CSS variables
│   └── api/                          # Route Handlers (server-side only)
│       ├── claude/route.js           # Claude API proxy
│       ├── grok/route.js             # Grok API proxy
│       ├── ideogram/route.js         # Ideogram proxy
│       ├── proxy-image/route.js      # Image resize/cache proxy
│       ├── profile/route.js          # PATCH profile fields
│       ├── weight/route.js           # POST/GET weight logs
│       ├── family/
│       │   ├── create/route.js       # POST create family
│       │   ├── invite/route.js       # POST/GET family invites
│       │   ├── accept-invite/route.js # POST accept family invite
│       │   ├── members/route.js      # PATCH/DELETE linked members
│       │   └── managed/route.js      # POST/PATCH/DELETE managed children
│       ├── nutritionist/
│       │   ├── connect/route.js      # POST/DELETE nutritionist link
│       │   └── notes/route.js        # POST nutritionist notes
│       ├── gdpr/
│       │   ├── export/route.js       # GET full data export (JSON download)
│       │   └── delete/route.js       # DELETE account + all data
│       ├── shopping-list/route.js    # Shopping list CRUD
│       ├── ingredient-alternatives/
│       │   └── route.js              # GET ingredient swap suggestions
│       ├── menus/apply/route.js      # POST copy menu to calendar
│       └── stripe/                   # Stripe checkout + portal
│
├── lib/                              # Business logic (no UI)
│   ├── supabase/
│   │   ├── client.js                 # Browser client
│   │   └── server.js                 # Server clients (SSR, public, admin)
│   ├── nutrition/
│   │   ├── portionCalc.js            # BMR, TDEE, legacy BMI fraction
│   │   ├── mealBudget.js             # Calorie-budgeted meal distribution (new model)
│   │   ├── nutrition.js              # NUTRITION_FIELDS, getNutritionData
│   │   ├── memberRDA.js              # 47-nutrient daily targets
│   │   ├── glycemicLoad.js           # GL estimation
│   │   ├── usdaLookup.js             # USDA API
│   │   └── usdaNutrition.js          # USDA nutrient mapping
│   ├── recipe/
│   │   ├── recipeGenerator.js        # Generation pipeline
│   │   ├── imageGeneration.js        # Image generation + storage
│   │   ├── ingredientDatabase.js     # Ingredient nutrition lookup
│   │   ├── ingredientSwap.js         # AI ingredient substitution
│   │   └── foodGroups.js             # Food group classification
│   ├── journal/
│   │   ├── grokFoodLookup.js         # Grok AI food nutrition lookup
│   │   └── openFoodFacts.js          # Barcode lookup
│   ├── member/
│   │   ├── syncFamily.js             # Load + compute family data
│   │   ├── memberColors.js           # Member avatar colors
│   │   ├── activityCalories.js       # Activity calorie estimation
│   │   └── recoveryFactor.js         # Recovery / rest day factor
│   ├── stripe.js                     # Stripe config, FREE_LIMITS
│   ├── promotions.js                 # Promotional pricing logic
│   ├── usageLimits.js                # Rate limiting
│   └── mealParser.js                 # Meal text parsing
│
├── contexts/
│   └── AuthContext.jsx               # Auth state (user, profile, loading)
│
├── hooks/
│   ├── useAuth.js                    # Re-export from AuthContext
│   ├── useFamily.js                  # Family members state
│   ├── useProfile.js                 # Profile state
│   ├── useSubscription.js            # Stripe subscription state
│   ├── useStorage.js                 # localStorage wrapper
│   └── useVoice.js                   # Web Speech API wrapper
│
├── components/                       # UI components
│   ├── shared/                       # AppNav, ShoppingCartLink, ThemeToggle
│   ├── home/                         # HeroSection, LandingClient
│   ├── landing/                      # LandingClient (full landing page)
│   ├── auth/                         # AuthModal (login/register/Google OAuth)
│   ├── recipes/                      # RecipesClient, RecipeCard, RecipeDetailClient, RecipeGeneratorClient
│   ├── planner/                      # PlannerClient, WeekOverview, DayAgenda, ActivityForm, JournalEntryForm, RecipePickerModal
│   ├── shopping/                     # ShoppingListClient
│   ├── menus/                        # MenusClient, MenuDetailClient
│   ├── statistics/                   # StatisticsClient (family dashboard + individual detail)
│   ├── account/                      # MyAccountClient (profile, weight, nutritionist, GDPR)
│   ├── family/                       # MyFamilyClient, FamilyInviteClient
│   ├── nutritionist/                 # NutritionistClient (dashboard, client cards, notes)
│   ├── blog/                         # BlogListClient, BlogEditorClient
│   ├── admin/                        # AdminClient
│   └── pricing/                      # PricingClient
│
├── knowledge/                        # Self-learning knowledge base
│   ├── INDEX.md                      # Table of contents
│   ├── patterns/                     # Approved patterns
│   ├── anti-patterns/                # What to avoid
│   ├── conventions/                  # Naming/file/styling conventions
│   ├── decisions/log.md              # ADRs
│   ├── sessions/                     # Per-session findings
│   └── prompts/                      # Reusable prompts
│
├── supabase/
│   ├── migrations/                   # SQL migrations
│   └── functions/                    # Edge Functions (Stripe)
│
├── middleware.js                     # Supabase session refresh
├── next.config.mjs                   # Image optimization, headers
├── jsconfig.json                     # @/* path alias
├── CLAUDE.md                         # AI assistant rules (hot)
├── SYSTEM.md                         # This file (system state)
└── package.json
```

---

## 🔄 Meal Types

Used consistently across Plan, Calendar, Statistics:

```
['breakfast', 'snack', 'lunch', 'snack2', 'dinner']
```

---

## 🔄 Subscription Tiers

| Tier | Members | Recipes/day | Planner range |
|---|---|---|---|
| free | 2 | 5 | Current week |
| pro | Unlimited | Unlimited | 365 days |
| family | Unlimited | Unlimited | 365 days |

**`FREE_LIMITS`** defined in `lib/stripe.js`: `{ membersPerFamily: 2, recipesPerDay: 5 }`

### Stripe Price IDs (v2)

| Plan | Billing | Env Var |
|---|---|---|
| Pro | Monthly $4.99 | `STRIPE_PRO_MONTHLY_PRICE_ID` |
| Pro | Yearly $39.99 | `STRIPE_PRO_YEARLY_PRICE_ID` |
| Family | Monthly $7.99 | `STRIPE_FAMILY_MONTHLY_PRICE_ID` |
| Family | Yearly $59.99 | `STRIPE_FAMILY_YEARLY_PRICE_ID` |

---

## 🔄 Database Schema

All tables in Supabase PostgreSQL. RLS enabled on everything.

### Core Tables

**`profiles`** — User accounts
- id (uuid, PK = auth.uid()), email, full_name, role, subscription_tier (free|pro|family), stripe_customer_id, units_preference, onboarding_pending (bool), weight, height, gender, date_of_birth, dietary_type, primary_goal, goals (text[])

**`families`** — Family groups
- id (uuid PK), name, created_by (FK→profiles), created_at

**`family_memberships`** — Links profiles to a family
- id, family_id (FK→families), profile_id (FK→profiles), role (admin|co-admin|member), status (active|removed), joined_at

**`managed_members`** — Children/dependents with no auth account
- id, family_id, managed_by (FK→profiles), name, gender, date_of_birth, weight_kg, height_cm, allergies (text[]), created_at

**`family_invites`** — Pending email invites
- id, family_id, invited_by (FK→profiles), email, token (unique, gen_random_bytes(32)), status (pending|accepted|cancelled|expired), expires_at, created_at

**`family_members`** — Legacy family member profiles (v1 compat)
- id, profile_id (FK→profiles), name, gender, date_of_birth, allergies, activity_profiles (jsonb), is_managed (bool)

**`measurements`** — Weight/height history per family_member (legacy)
- id, family_member_id, weight_kg, height_cm, recorded_at

**`weight_logs`** — Weight history per profile (v2)
- id, profile_id (FK→profiles), weight_kg, logged_date (date), created_at
- UNIQUE(profile_id, logged_date)

**`recipes`** — All recipes
- id, profile_id, title, description, meal_type, food_type, cuisine_type, servings, instructions (jsonb), nutrition (jsonb: {totals, perServing}), image_url, image_thumb_url, is_public, slug, created_at

**`recipe_ingredient_swaps`** — Persisted ingredient swaps per user per recipe
- id, profile_id (FK→profiles), recipe_id (FK→recipes), original_name, replacement_name, replacement_note, amount_factor
- UNIQUE(profile_id, recipe_id, original_name)
- RLS: auth.uid() = profile_id

**`calendar_entries`** — Meal plan (one row per member per recipe per slot)
- id, profile_id, date_str (YYYY-MM-DD), meal_type, recipe_id, recipe_name, member_id, consumer_member_ids (uuid[]), personal_nutrition (jsonb), origin (planned|journal)
- UNIQUE(family_id, date_str, meal_type, recipe_id, origin)

**`day_meal_config`** — Per-day meal type toggles
- id, family_id (FK→families), date_str (date), enabled_meal_types (text[]), created_at
- UNIQUE(family_id, date_str)
- RLS: family-scoped (read/insert/update via family_memberships)

**`food_journal`** — Journal entries
- id, profile_id, logged_date, meal_type, food_name, amount, unit, nutrition (jsonb), member_id

**`daily_usage`** — Rate limiting
- user_id, date, recipe_generations, food_journal_entries

**`subscriptions`** — Stripe subscription mirror
- user_id, stripe_customer_id, stripe_subscription_id, status, tier, current_period_end

---

## 🔄 Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=...              (server-side only)
ANTHROPIC_API_KEY=sk-ant-...              (server-side only)
XAI_API_KEY=...                           (server-side only, used by /api/grok)
IDEOGRAM_API_KEY=...                      (server-side only)
STRIPE_SECRET_KEY=...                     (server-side only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...    (browser-safe)
STRIPE_PRO_MONTHLY_PRICE_ID=...
STRIPE_PRO_YEARLY_PRICE_ID=...
STRIPE_FAMILY_MONTHLY_PRICE_ID=...
STRIPE_FAMILY_YEARLY_PRICE_ID=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=https://mintyfit.com      # Used for family invite link generation
```

No `VITE_` prefixed variables. All browser-safe vars use `NEXT_PUBLIC_`.

---

## Authentication

- Supabase Auth (email/password + OAuth)
- `AuthContext.jsx` wraps app; provides `user`, `profile`, `setProfile`, `loading`
- `middleware.js` refreshes Supabase session on every request
- Protected routes: `/dashboard`, `/recipes`, `/generate`, `/plan`, `/journal`, `/stats`, `/family`, `/account`

### Onboarding Flow (New Users)

**Email signup:** `POST /api/auth/signup` creates user via Admin API (no default Supabase email). Extracts token from Admin API-generated magic link. Sends welcome email with link to `/auth/verify?token=xxx&email=yyy` (not Supabase-hosted URL — avoids PKCE issues).

**Magic link verification:** `/auth/verify` calls `supabase.auth.verifyOtp({ email, token, type: 'magiclink' })` which creates the session server-side without needing a browser PKCE verifier. Then creates profile with `onboarding_pending: true` and redirects to `/onboarding`.

**Google OAuth:** Goes through `/auth/callback` which exchanges the OAuth code for a session. Creates profile with `onboarding_pending: true` for new users. Redirects to `/onboarding`.

**Direct password sign-in:** AuthModal checks `profiles.onboarding_pending` after successful `signInWithPassword()` and redirects to `/onboarding` if pending.

**Onboarding wizard** (`/onboarding/page.jsx`) is auth-aware:
- Unauthenticated users: 4-step wizard, step 4 shows "Create account" CTA
- Authenticated users: step 4 shows "Save & start planning" — saves family data via `POST /api/onboarding/complete`, clears `onboarding_pending`

---

## Food Journal Entry Methods

1. **✨ Describe** — Free text or voice → AI parses meal → resolves nutrition per ingredient → review and save
2. **📷 Scan** — Barcode → Open Food Facts API → enter portion → save with full nutrition
3. **+ Quick add** — Food name + amount + unit → Grok nutrition lookup → save

All three produce identical entry structure: `{ id, text, amount, unit, mealType, memberId, nutrition, nutritionSource }`

---

## Personal Nutrition Formulas (memberRDA.js)

Metabolic-health focused: low carb (~9% of calories), higher protein (1.2g/kg bodyweight), healthy fats as primary energy source.

Key formulas (dc = baseDailyCalories, w = weight kg):
- Protein: `w × 1.2` g
- Carbs: `dc × 9 / 100 / 4` g
- Fiber: men `dc/1000 × 38`, women `dc/1000 × 25`
- All 47 nutrients have formulas based on age, gender, weight, calories

---

## Build Status (v2 Complete)

All 40 routes built and passing `next build`. Sessions 01–09 complete.

### Implemented Routes

| Category | Routes |
|---|---|
| Public | `/`, `/recipes`, `/recipes/[slug]`, `/recipes/generate`, `/menus`, `/menus/[slug]`, `/blog`, `/blog/[slug]`, `/pricing`, `/pages/[slug]` |
| Authenticated | `/plan`, `/statistics`, `/my-account`, `/my-family`, `/shopping-list`, `/nutritionist`, `/family-invite/[token]` |
| Admin | `/admin`, `/blog/new`, `/blog/[slug]/edit` |
| Auth | `/auth/callback`, `/auth/verify`, `/auth/reset-callback`, `/onboarding` |
| API | `/api/onboarding/complete` — saves family data and clears onboarding |
| SEO | `/sitemap.xml`, `/robots.txt` |

### Environment Variables Required for Production

- `STRIPE_SECRET_KEY` — Must be added manually
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook secret
- All Stripe price IDs (4 vars)
- `SUPABASE_SERVICE_ROLE_KEY` — For GDPR delete and admin operations
- `IDEOGRAM_API_KEY` — For recipe image generation

### Post-Deploy Checklist (not yet done)

- [ ] Switch `mintyfit.com` to new Vercel project
- [ ] Update Stripe webhook URL
- [ ] Update Supabase Auth redirect URLs
- [ ] Update Google OAuth authorized redirect URIs
- [ ] Submit sitemap to Google Search Console
