# MintyFit v2 — System Documentation

> **AUTO-UPDATE:** Claude Code must update this file after any task that changes the database schema, adds/removes utility files or components, modifies the nutrition data flow, adds features, or changes environment variables. See `CLAUDE.md` for the full checklist. Sections marked with 🔄 need updates most often.

---

## What is MintyFit?

MintyFit (mintyfit.com) is a family nutrition and meal planning platform. Users generate AI-powered recipes, track 47+ micronutrients with personal targets based on each family member's body parameters, plan weekly meals with BMI-scaled portions, log food via manual entry, AI description, or barcode scan, and review nutrition history in Statistics.

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
│ 1. RECIPE CREATION                                          │
│    Ingredients → Claude Haiku / USDA → 47-nutrient profile  │
│    Stored on recipe as { totals, perServing }               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 2. FAMILY MEMBER                                            │
│    Sex + Age + Weight + Height                              │
│    → BMR (Mifflin-St Jeor) → TDEE (BMR × 1.2)             │
│    → computeMemberDailyNeeds() → 47 personal daily targets  │
│    Source: lib/nutrition/portionCalc.js (BMR)               │
│            lib/nutrition/memberRDA.js (daily needs)         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 3. SINGLE RECIPE VIEW                                       │
│    User selects family members + logs activity              │
│    → BMI fraction × activity factor → personal portion      │
│    → Ingredient amounts scaled per member                   │
│    → RDA% bars show personal targets from memberRDA.js      │
│    Source: lib/nutrition/portionCalc.js (scaling)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 4. CALENDAR (calendar_entries table)                        │
│    Recipe added to plan → one row per member saved          │
│    Each row: member_id + personal_nutrition (JSONB)         │
│    = pre-computed scaled nutrition snapshot                  │
│    Historical data is IMMUTABLE                             │
│                                                             │
│    Journal entries → food_journal table                     │
│    Each entry: member_id + nutrition (exact amount eaten)   │
│    No BMI scaling — journal is a fact, not a plan           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 5. STATISTICS                                               │
│    Reads personal_nutrition from calendar — NO calculations │
│    Sums stored values, filters by date/member/meal type     │
│    Compares against computeMemberDailyNeeds() targets       │
│    Flags deficiencies (<70%) and excesses (>150%)           │
└─────────────────────────────────────────────────────────────┘
```

**Single source of truth:** Nutrition is calculated ONCE at save time. Statistics only reads and sums stored values. No nutrition calculation logic in Statistics or any read-path component.

---

## 🔄 Key Utility Files

| File | Purpose |
|---|---|
| `lib/nutrition/portionCalc.js` | `computeBMR()`, `computeTDEE()`, `computeFamilyBMI()`, `getMemberBMIFraction()`, `getMemberActivityFactor()`, `computeMemberNutrition()` — SINGLE SOURCE OF TRUTH for portion scaling and BMR |
| `lib/nutrition/memberRDA.js` | `computeMemberDailyNeeds(member)` — 47 personal daily nutrient targets. Metabolic-health focused (low carb, higher protein) |
| `lib/nutrition/nutrition.js` | `NUTRITION_FIELDS` array (47 nutrients), `getNutritionData()`, `scaleNutrition()`, `sumNutrition()` |
| `lib/member/syncFamily.js` | `syncFamilyMembers(userId)` — loads family from Supabase with measurements, computes BMR/TDEE |
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
│       └── proxy-image/route.js      # Image resize/cache proxy
│
├── lib/                              # Business logic (no UI)
│   ├── supabase/
│   │   ├── client.js                 # Browser client
│   │   └── server.js                 # Server clients (SSR, public, admin)
│   ├── nutrition/
│   │   ├── portionCalc.js            # BMR, TDEE, portion scaling
│   │   ├── nutrition.js              # NUTRITION_FIELDS, getNutritionData
│   │   ├── memberRDA.js              # 47-nutrient daily targets
│   │   ├── usdaLookup.js             # USDA API
│   │   └── usdaNutrition.js          # USDA nutrient mapping
│   ├── recipe/
│   │   ├── recipeGenerator.js        # Generation pipeline
│   │   ├── imageGeneration.js        # Image generation + storage
│   │   ├── ingredientDatabase.js     # Ingredient nutrition lookup
│   │   ├── ingredientSwap.js         # AI ingredient substitution
│   │   └── foodGroups.js             # Food group classification
│   ├── journal/
│   │   └── openFoodFacts.js          # Barcode lookup
│   ├── member/
│   │   ├── syncFamily.js             # Load + compute family data
│   │   └── memberColors.js           # Member avatar colors
│   ├── stripe.js                     # Stripe config, FREE_LIMITS
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
│   └── useSubscription.js            # Stripe subscription state
│
├── components/                       # UI components (to be built)
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
- id (uuid, PK = auth.uid()), email, full_name, role, subscription_tier (free|pro|family), stripe_customer_id, units_preference

**`family_memberships`** — Links users to a family account
- id, owner_id (FK→profiles), member_id (FK→profiles), role (owner|member), status

**`family_members`** — Family member profiles (can be managed members with no auth)
- id, profile_id (FK→profiles), name, gender, date_of_birth, allergies, activity_profiles (jsonb), is_managed (bool)

**`measurements`** — Weight/height history per member
- id, family_member_id, weight_kg, height_cm, recorded_at

**`recipes`** — All recipes
- id, profile_id, title, description, meal_type, food_type, cuisine_type, servings, instructions (jsonb), nutrition (jsonb: {totals, perServing}), image_url, image_thumb_url, is_public, slug, created_at

**`calendar_entries`** — Meal plan (one row per member per recipe per slot)
- id, profile_id, date_str (YYYY-MM-DD), meal_type, recipe_id, recipe_name, member_id, personal_nutrition (jsonb)
- UNIQUE(profile_id, date_str, meal_type, recipe_id, member_id)

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
GROK_API_KEY=...                          (server-side only)
IDEOGRAM_API_KEY=...                      (server-side only)
STRIPE_SECRET_KEY=...                     (server-side only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...    (browser-safe)
STRIPE_PRO_MONTHLY_PRICE_ID=...
STRIPE_PRO_YEARLY_PRICE_ID=...
STRIPE_FAMILY_MONTHLY_PRICE_ID=...
STRIPE_FAMILY_YEARLY_PRICE_ID=...
STRIPE_WEBHOOK_SECRET=...
```

No `VITE_` prefixed variables. All browser-safe vars use `NEXT_PUBLIC_`.

---

## Authentication

- Supabase Auth (email/password + OAuth)
- `AuthContext.jsx` wraps app; provides `user`, `profile`, `setProfile`, `loading`
- `middleware.js` refreshes Supabase session on every request
- Protected routes: `/dashboard`, `/recipes`, `/generate`, `/plan`, `/journal`, `/stats`, `/family`, `/account`

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

## Known Gaps / Build Status

- **Components**: No UI components built yet — `app/page.jsx` is placeholder
- **Pages**: Only home route exists; all authenticated routes to be built
- **Supabase migrations**: Need to be written (schema above is target state)
- **Edge Functions**: Stripe checkout/portal Edge Functions not yet created for v2
- **`lib/nutrition/memberRDA.js`**: Not yet transplanted from v1
- **`lib/usageLimits.js`**: Not yet transplanted from v1
- **`lib/mealParser.js`**: Not yet transplanted from v1
