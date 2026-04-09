# MintyFit v2 — Task Reference

> Claude Code: Read the section matching the current task from CHECKPOINT.md.
> Do NOT read this entire file — only load the section you need.

---

# SESSION 01 — PROJECT FOUNDATION

## TASK 1.1: Create GitHub repo and scaffold Next.js 15 project

**Do:**
1. Use GitHub MCP to create private repo `mintyfit-v2` with description "MintyFit — Family nutrition and meal planning platform. Next.js 15, Supabase, AI-powered."
2. Scaffold the project:
```bash
cd "D:\WORKS\Minty\NewMintyAprill2026\AprillBuild"
npx create-next-app@latest mintyfit-v2 --app --tailwind --eslint --no-src-dir --import-alias "@/*" --no-turbopack
```

**Rules:**
- App Router only. No Pages Router, no React Router DOM.
- No `src/` directory — files at root: `app/`, `lib/`, `components/`, etc.
- Tailwind CSS 4
- Import alias `@/*`

**Verify:** Directory exists, `package.json` has `next`, no `react-router-dom`, no `src/` dir.

---

## TASK 1.2: Install dependencies and create project directory structure

**Do:**
```bash
cd "D:\WORKS\Minty\NewMintyAprill2026\AprillBuild\mintyfit-v2"

npm install @supabase/supabase-js @supabase/ssr
npm install lucide-react dompurify
npm install stripe @stripe/stripe-js
npm install -D sharp @types/dompurify

mkdir -p app/api
mkdir -p components/auth components/home components/shared
mkdir -p contexts
mkdir -p lib/supabase lib/nutrition lib/recipe lib/journal lib/member
mkdir -p hooks
mkdir -p public/images public/fonts
mkdir -p knowledge/{patterns,anti-patterns,conventions,decisions,sessions,prompts}
mkdir -p supabase/{migrations,functions}
```

**Verify:** All directories exist, `package.json` has all deps, no `react-router-dom`.

---

## TASK 1.3: Create CLAUDE.md with all project rules

**Do:** Create `CLAUDE.md` in project root with the full content from SESSION-01-FOUNDATION.md Step 5. Include the Overnight Execution Protocol from OVERNIGHT-PROTOCOL-FOR-CLAUDE-MD.md.

Key sections: Project Context, Strategic Position, Core Principles, Architecture Rules (Tech Stack, File Organization, URL Structure, Nutrition Data Flow, Files You Must Not Duplicate Logic From, Meal Types, Family Architecture), Workflow Rules (Plan Before Building, Verify Before Done, Knowledge System, SYSTEM.md Auto-Update Rule), Overnight Execution Protocol.

**Verify:** File exists, contains all sections, overnight protocol included.

---

## TASK 1.4: Create SYSTEM.md with full technical documentation

**Do:** Create `SYSTEM.md` in project root. Reference old project's SYSTEM.md at `D:/WORKS/Minty/March2026/SYSTEM.md` for database schema and nutrition data flow.

Include: Project overview (Smart Diet OÜ, Vercel, Supabase), tech stack table, family account architecture (families, family_memberships, managed_members — marked as "planned"), database schema (existing tables from old project + planned new tables), nutrition data flow diagram, key utility files table (new paths under `lib/`), repository structure, meal types, subscription tiers (Free/Pro $4.99/Family $7.99), env vars (NEXT_PUBLIC_ only), auth (Supabase Auth + Google/Facebook OAuth).

**Verify:** File exists, no VITE_ references, new pricing tiers documented, family architecture documented.

---

## TASK 1.5: Create knowledge system (all files in knowledge/)

**Do:** Create all knowledge system files exactly as specified in KNOWLEDGE-SYSTEM-REFERENCE.md:

Files to create:
- `knowledge/INDEX.md`
- `knowledge/patterns/data-fetching.md`
- `knowledge/patterns/supabase.md`
- `knowledge/patterns/auth.md`
- `knowledge/patterns/component-design.md`
- `knowledge/patterns/ai-integration.md`
- `knowledge/anti-patterns/known-pitfalls.md`
- `knowledge/conventions/naming.md`
- `knowledge/conventions/file-structure.md`
- `knowledge/conventions/styling.md`
- `knowledge/decisions/log.md`
- `knowledge/prompts/session-wrap.md`
- `knowledge/prompts/consolidate.md`
- `knowledge/prompts/cross-project.md`
- `knowledge/sessions/overnight-learnings.md` (empty, for overnight logs)

**Important:** Update the pattern files to reflect the v2 architecture (no hybrid bridge layer, no dual Supabase clients, no VITE_ fallbacks). This is a clean build.

**Verify:** All 15 files exist. `knowledge/` is NOT in `.gitignore`.

---

## TASK 1.6: Create Supabase client, middleware, AuthContext, and app layout

**Do:**

1. Create `lib/supabase/client.js` — browser client using `@supabase/ssr` with `NEXT_PUBLIC_` env vars only
2. Create `lib/supabase/server.js` — server client using `@supabase/ssr` with cookie handling, plus `createPublicClient()` for public pages
3. Create `middleware.js` — protects `/my-account`, `/my-family`, `/plan`, `/generate`, `/nutritionist`, `/admin`, `/statistics`. Redirects to `/?auth=login`.
4. Create `contexts/AuthContext.jsx` — single auth context. Base on old `D:/WORKS/Minty/March2026/contexts/AuthContext.jsx`, update imports to `@/lib/supabase/client`.
5. Create `app/layout.jsx` — Montserrat font, ThemeContext, AuthProvider, placeholder Navbar/Footer, SEO metadata
6. Create `app/globals.css` — copy from old project
7. Create placeholder `app/page.jsx`

**Verify:** `npm run dev` starts without errors. No VITE_ references in any file.

---

## TASK 1.7: Copy static assets, set up .env.local, configure next.config.mjs

**Do:**

1. Copy from old project (`D:/WORKS/Minty/March2026/`):
   - `public/fonts/` → `public/fonts/`
   - `public/images/` → `public/images/`
   - `public/MintyHero.webp` → `public/MintyHero.webp`
   - `public/favicon.ico`, `public/favicon-192.png`

2. Read old `.env.local` (or `.env`), create new `.env.local` with:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (convert from VITE_ if needed)
   - `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GROK_API_KEY`, `IDEOGRAM_API_KEY`
   - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - NO `VITE_` vars

3. Create `next.config.mjs` — image remote patterns (supabase.co, ideogram.ai), security headers, cache headers, ESLint ignored during builds

**Verify:** `.env.local` exists with all keys, `.env.local` is in `.gitignore`, `next.config.mjs` has image domains.

---

## TASK 1.8: Git commit, push, deploy to Vercel test URL

**Do:**
```bash
cd "D:\WORKS\Minty\NewMintyAprill2026\AprillBuild\mintyfit-v2"
git init
git add .
git commit -m "feat: initial project foundation - Next.js 15, Supabase, knowledge system"
git remote add origin <repo-url-from-task-1.1>
git branch -M main
git push -u origin main

vercel link
# Set env vars in Vercel:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add GROK_API_KEY
vercel env add IDEOGRAM_API_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel --prod
```

**Verify:** GitHub repo has code. Vercel test URL (`mintyfit-v2.vercel.app`) shows placeholder page.

---

# SESSION 02 — BUSINESS LOGIC TRANSPLANT

## TASK 2.1: Transplant nutrition utilities

**Do:** Copy from old `D:\WORKS\Minty\March2026\src\utils\` to new `lib/nutrition/`:
- `portionCalc.js` → `lib/nutrition/portionCalc.js`
- `memberRDA.js` → `lib/nutrition/memberRDA.js`
- `nutrition.js` → `lib/nutrition/nutrition.js`
- `glycemicLoad.js` → `lib/nutrition/glycemicLoad.js`
- `usdaNutrition.js` → `lib/nutrition/usdaNutrition.js`
- `usdaLookup.js` → `lib/nutrition/usdaLookup.js`

Update all internal imports to `@/lib/nutrition/...`. Fix cross-references between these files.

**Verify:** No `src/` imports, no `VITE_` refs. Files parse without syntax errors.

---

## TASK 2.2: Transplant recipe utilities

**Do:** Copy to `lib/recipe/`:
- `recipeGenerator.js`, `imageGeneration.js`, `foodGroups.js`, `ingredientDatabase.js`, `ingredientSwap.js`

Update imports. `recipeGenerator.js` imports from `nutrition.js` → change to `@/lib/nutrition/nutrition`.

**Verify:** No `src/` imports. Files parse without errors.

---

## TASK 2.3: Transplant journal utilities

**Do:** Copy to `lib/journal/`:
- `grokFoodLookup.js`, `openFoodFacts.js`

Update imports.

**Verify:** No `src/` imports.

---

## TASK 2.4: Transplant member utilities

**Do:** Copy to `lib/member/`:
- `syncFamily.js`, `activityCalories.js`, `recoveryFactor.js`, `memberColors.js`

Update imports.

**Verify:** No `src/` imports.

---

## TASK 2.5: Transplant standalone utilities and Stripe utils

**Do:**
- `unitConversion.js` → `lib/unitConversion.js`
- `usageLimits.js` → `lib/usageLimits.js`
- `mealParser.js` → `lib/mealParser.js`
- `utils/stripe.js` → `lib/stripe.js`
- `utils/promotions.js` → `lib/promotions.js`

Update PLANS constant in `lib/stripe.js` to new tiers:
- Free: 2 members, 5 recipes/day, full planner, all 47 nutrients, journal, basic shopping list
- Pro ($4.99/mo, $39.99/yr): 1 person, unlimited recipes, stats, activity, advanced shopping list
- Family ($7.99/mo, $59.99/yr): up to 6 accounts + kids, everything Pro, shared planning, family dashboard, nutritionist link

**Verify:** PLANS constant has correct prices. No old pricing.

---

## TASK 2.6: Create API routes

**Do:** Create Next.js Route Handlers:
- `app/api/claude/route.js` — from old `api/claude.js`, convert to `export async function POST(request)`
- `app/api/grok/route.js` — from old `api/grok.js`
- `app/api/ideogram/route.js` — from old `api/ideogram.js`
- `app/api/proxy-image/route.js` — from old `api/proxy-image.js`

All use `NextResponse` from `next/server`. All inject API keys from `process.env` (not from client).

**Verify:** Each route file exports POST (or GET where appropriate). No VITE_ refs.

---

## TASK 2.7: Transplant Supabase migrations and edge functions

**Do:**
```bash
cp -r "D:/WORKS/Minty/March2026/supabase/migrations/"* supabase/migrations/
cp -r "D:/WORKS/Minty/March2026/supabase/functions/"* supabase/functions/
```

**Verify:** Files exist in `supabase/migrations/` and `supabase/functions/`.

---

## TASK 2.8: Create custom hooks

**Do:** Create in `hooks/`:
- `useAuth.js` — re-export from AuthContext
- `useFamily.js` — adapt from old `src/hooks/useFamily.js`, update Supabase import to `@/lib/supabase/client`
- `useProfile.js` — adapt from old
- `useSubscription.js` — adapt from old
- `useStorage.js` — copy from old (pure localStorage wrapper, minimal changes)
- `useVoice.js` — copy from old (Web Speech API wrapper, no changes)

**Verify:** No `src/` imports. All import from `@/lib/supabase/client`.

---

## TASK 2.9: Verify all imports clean, build passes, commit and push

**Do:**
```bash
grep -r "from.*src/" lib/ hooks/ --include="*.js" --include="*.jsx"
grep -r "VITE_" lib/ hooks/ --include="*.js" --include="*.jsx"
```
Both must return zero results.

```bash
npm run build
git add .
git commit -m "feat: transplant business logic - nutrition, recipes, journal, member utils"
git push
```

**Verify:** Build passes (warnings OK, no errors in lib/ or hooks/). Git pushed.

---

# SESSION 03 — LANDING PAGE & ONBOARDING

## TASK 3.1: Build hero section and how-it-works section

**Do:** Create `app/page.jsx` as a Server Component.

**Hero Section:** Two columns desktop, stacked mobile.
- Headline: "Your family eats differently. Now they can eat right."
- Subheadline: "MintyFit plans every meal around each person's body — their age, weight, goals, and allergies. One plan. Everyone covered. Generated by AI in seconds."
- Primary CTA: "Plan Your Family's First Week — Free →" (green, links to `/onboarding`)
- Secondary CTA: "See how it works ↓" (scroll link)
- Hero image: `MintyHero.webp` via `next/image` with `priority`
- CTA is a client component (show "Open App" if logged in)

**How It Works:** 3 cards (horizontal desktop, stacked mobile).
- Step 1: "Tell us about your family" — add members, MintyFit calculates needs
- Step 2: "Generate recipes with AI" — describe what you want, get recipe + photo + 47 nutrients
- Step 3: "Plan your week, shop, and cook" — drag recipes, get portions, auto shopping list

**Verify:** Page renders server-side. Hero image loads with priority. CTA links to `/onboarding`.

---

## TASK 3.2: Build feature highlights and pricing preview sections

**Do:** Add to `app/page.jsx`:

**Feature Highlights:** 4 cards with icons (use lucide-react).
- "Stop cooking two separate dinners" (Users icon)
- "Dinner idea to full recipe in 30 seconds" (Sparkles icon)
- "Know exactly what your family is missing" (BarChart icon)
- "Sunday planning. Done in 10 minutes." (Calendar icon)
Each card: title + 2-3 sentence outcome description.

**Pricing Preview:** 3 tier cards inline. Free ($0), Pro ($4.99/mo), Family ($7.99/mo — highlighted). Use PLANS from `lib/stripe.js`. Below: "A family of 4 on MyFitnessPal: $400/year. MintyFit Family: $60/year."

**Verify:** All 4 feature cards render. Pricing shows correct amounts. Mobile responsive.

---

## TASK 3.3: Build trust/credentials, FAQ, and final CTA sections

**Do:** Add to `app/page.jsx`:

**Trust:** "Built by a nutrition professional, not a tech startup." Precision Nutrition cert mention. USDA data backing. Smart Diet OÜ, Estonia. EU data.

**FAQ:** Accordion pattern. Questions: family planning, dietary restrictions, AI generation, vs MyFitnessPal, data security, cancel anytime.

**Final CTA:** Green gradient bg. "Ready to feed your family better?" + "Start with a free plan. No credit card required." + button.

**Verify:** FAQ expands/collapses. Final CTA button links to `/onboarding`. Dark mode works.

---

## TASK 3.4: Build onboarding quiz screens 1-3

**Do:** Create `app/onboarding/page.jsx` as a client component.

**Screen 1 "Who's at your table?":** Form for user info (name, DOB, gender, weight kg/lbs, height cm/ft). "+ Add another family member" button. Kids under 13 get simplified fields.

**Screen 2 "Any dietary needs?":** Per-member toggleable chips: Vegetarian, Vegan, Gluten-free, Dairy-free, Nut allergy, Keto, Paleo, Pescatarian, No restrictions.

**Screen 3 "What's your goal?":** Cards: Lose weight, Eat healthier, Build muscle, Manage health condition, Feed my family better.

All data stored in localStorage key `mintyfit-onboarding`. "Next →" progresses screens.

**Verify:** All 3 screens work. Data persists in localStorage between screens. Back navigation works.

---

## TASK 3.5: Build onboarding quiz screen 4 (payoff)

**Do:** Screen 4 "Here's what dinner looks like for your family":

1. Read family data from localStorage
2. Calculate BMR and daily calorie targets using `lib/nutrition/portionCalc.js`
3. Show a sample recipe with per-member portions:
   ```
   Mediterranean Chicken Bowl
   Ronald (82kg): 1.2× portion — 680 kcal
   Anna (65kg): 0.9× portion — 520 kcal
   Leo (14kg, age 3): 0.4× portion — 280 kcal
   ```
4. Show Big 4 nutrition per member
5. CTA: "Create a free account to plan your full week →" opens auth modal

**Verify:** Portions calculate correctly based on entered body stats. CTA opens auth modal.

---

## TASK 3.6: Build auth modal

**Do:** Create `components/auth/AuthModal.jsx`:
- Google OAuth button (biggest, most prominent)
- Facebook OAuth button
- Divider "or sign up with email"
- Email + Password (2 fields, no confirm password)
- GDPR/Terms checkbox: "I agree to the Privacy Policy and Terms of Service."
- Sign-in tab: Email + Password + OAuth buttons
- Opens via `?auth=login` URL param or programmatic trigger

**Verify:** Modal opens/closes. Google OAuth initiates. Email form validates. Tab switch works.

---

## TASK 3.7: Wire onboarding to profile creation, verify full flow, commit

**Do:**
1. After sign-up, read `mintyfit-onboarding` from localStorage
2. Create profile with name, DOB, gender, weight, height, dietary prefs, goals
3. Create family members from onboarding data
4. Clear localStorage key
5. Redirect to `/plan`

```bash
git add .
git commit -m "feat: landing page, onboarding quiz, auth modal"
git push
```

**Verify:** Full flow works: landing → onboarding → sign up → profile created → redirected to plan.

---

# SESSION 04 — RECIPES & GENERATOR

## TASK 4.1: Build recipe list page

**Do:** Create `app/recipes/page.jsx` — Server Component for SSR, Client wrapper for interactivity.

- Grid of recipe cards (image via `next/image`, title, short description 1 line, meal type badge, prep+cook time, calorie count)
- Search bar (full-text on title/description)
- Filters: meal type, food type, cuisine, calorie range, glycemic load
- Sort: newest, oldest, most popular
- "Generate a new recipe with AI" button at top
- Pagination or infinite scroll
- Favourites toggle (heart icon, requires auth)
- Clean URLs: `/recipes` list, `/recipes/[slug]` detail

**Verify:** Page renders with recipe cards. Search filters work. Mobile responsive.

---

## TASK 4.2: Build recipe generator — describe and progress

**Do:** Create recipe generator UI (at `/recipes/generate` or within recipes page).

**Describe step:**
- Text input "What do you want to eat?"
- Voice input button (useVoice hook)
- Meal type selector (optional)
- Suggestion chips
- `isFoodRelated()` guard

**Progress indicator:** Three-step:
1. "Creating recipe..." — Claude Haiku
2. "Looking up nutrition..." — USDA/Claude (parallel with 3)
3. "Generating photo..." — Ideogram (parallel with 2)

**CRITICAL:** Image generates in parallel and appears BEFORE save decision.

**Verify:** Progress shows all 3 steps. Image appears when ready. Non-food queries rejected.

---

## TASK 4.3: Build recipe generator — preview card

**Do:** Preview card after generation:
- Food image at top (large) — or skeleton if still loading
- Recipe title
- Short description (2-3 sentences: what it is, cuisine, nutritional highlight)
- Meal type, servings, total time
- Donut chart (Big 4: cal/protein/carbs/fat)
- Ingredients list (grouped by component)
- First 3 steps shown, rest collapsed
- "Save Recipe" (primary), "Regenerate" (secondary), "Discard" (tertiary)

**Verify:** Preview shows complete recipe. Image visible before save. Save creates DB record with slug.

---

## TASK 4.4: Build recipe detail page — top section, ingredients, member selector

**Do:** Create `app/recipes/[slug]/page.jsx` — Server Component for SSR, client components for interactivity.

**Top section:** Large image, title, short description, meta row (meal type, servings, times, cuisine, badges), action buttons (Add to Plan, Add to Shopping List, Favourite, Share).

**Ingredients:** Grouped by component (main, side, dressing). Member selector tabs/chips. Amounts update per member's portion. Uses `portionCalc.js`.

**Steps:** Numbered, contextual references to ingredients.

**Verify:** `/recipes/[slug]` loads by slug. Member selector switches portions. Mobile responsive.

---

## TASK 4.5: Build recipe detail — progressive nutrition disclosure

**Do:** Three layers:
- **Layer 1 (always visible):** Donut chart + single row: Cal/Protein/Carbs/Fat with grams + % daily target. Color-coded green/amber/red.
- **Layer 2 ("Key nutrients" expandable):** 6-8 nutrients based on user's goal. Each: amount, unit, % daily target.
- **Layer 3 ("All 47 nutrients" expandable):** Full bar chart, RDA % bars color-coded (green >70%, amber 40-70%, red <40%, dark red >150%).

All scaled to selected member.

**Verify:** All 3 layers work. Expand/collapse. Values change with member selector.

---

## TASK 4.6: Wire buttons, add JSON-LD, verify and commit

**Do:**
1. "Add to Shopping List" button — creates/merges list (placeholder logic OK, full impl in session 06)
2. "Add to Plan" button — placeholder, full impl in session 05
3. Recipe JSON-LD on detail pages (name, image, ingredients, instructions, nutrition, times)
4. Test with Google Rich Results Test

```bash
git add .
git commit -m "feat: recipes list, AI generator with image, recipe detail with progressive nutrition"
git push
```

**Verify:** Buttons present and wired. JSON-LD in page source. Build passes.

---

# SESSION 05 — MEAL PLANNER

## TASK 5.1: Build week overview

**Do:** Create `app/plan/page.jsx`.

**Week Overview (default view):** 7 day columns. Each shows:
- Day name + date
- Nutrition completeness indicator per member (progress ring/bar)
- Dots for filled/empty meal slots (5 slots)
- Activity badge if activities logged
- Click day → opens Day Agenda

Week nav: ◀ Previous | Date range | Next ▶

**No recipe names, no journal entries, no numbers.** Just the pattern.

**Verify:** 7 columns render. Week navigation works. Click day opens agenda.

---

## TASK 5.2: Build day agenda

**Do:** Day Agenda view within `/plan`:

Vertical scroll: Activities section → Breakfast → Snack → Lunch → Snack2 → Dinner → Day Summary.

Each meal slot shows:
- Recipe entries: name as link to `/recipes/[slug]?date=X&meal=Y`, per-member Big 4 inline, [×] remove
- Journal entries: expand inline, member attribution, [×] remove
- "+ Add recipe" and "+ Journal" buttons

**Day Summary:** Each member's consumed vs target. Progress bar color-coded.

**Verify:** Slots show recipes and journal entries. Links work. Summary calculates correctly.

---

## TASK 5.3: Build activity system

**Do:**
- Activities at top of Day Agenda
- Per-member per-day, stored in `daily_activities`
- Default templates from member profiles auto-populate
- "+ Add" form: member, activity type, time, duration
- Admin can add for any member
- When activities change: recalculate calorie target via `computeMemberDailyNeeds()`, update Day Summary

**Verify:** Activities show per member. Adding activity updates calorie target. Defaults populate.

---

## TASK 5.4: Build food journal in planner

**Do:** Journal entry form in each meal slot:

Three input methods:
1. **Quick add:** Food name + amount + unit → Grok AI nutrition lookup
2. **AI describe:** Free text or voice → AI parses → resolve nutrition → review + save
3. **Barcode scan:** Camera → Open Food Facts → portion → save

**Frequent foods:** If logged 3+ times, show for one-tap re-logging.

Journal entry object: id, food_name, amount, unit, meal_type, member_id, nutrition, nutrition_source, logged_date.

**Verify:** All 3 input methods work. Journal entries appear in meal slots with nutrition.

---

## TASK 5.5: Build recipe picker and drag-and-drop sidebar

**Do:**
- "+ Add recipe" button opens recipe picker: search, recent, favourites, "Generate new"
- Desktop: recipe sidebar on right of week overview for drag-and-drop
- Drag recipe → day column → prompt for meal slot → add

**Verify:** Picker opens and selects recipes. Drag-and-drop works on desktop.

---

## TASK 5.6: Build mobile planner

**Do:** Mobile layout:
- Horizontal date strip at top: `◀ [Mon] [TUE] [Wed] [Thu] [Fri] [Sat] [Sun] ▶`
- Dot indicators per day (filled/empty)
- Active day highlighted
- Tap day → agenda below
- Swipe left/right changes weeks

**Verify:** Date strip renders at 375px. Tap switches days. Swipe works.

---

## TASK 5.7: Wire shopping list generation, verify, commit

**Do:**
1. "Generate shopping list for this week" button in Week Overview
2. Scans all planned recipes, aggregates ingredients, groups by food category
3. Creates/updates shopping list entity
4. Badge on cart icon updates

```bash
git add .
git commit -m "feat: meal planner - week overview, day agenda, journal, activities"
git push
```

**Verify:** Shopping list generates from planned recipes. Ingredients deduplicated. Build passes.

---

# SESSION 06 — MENUS & SHOPPING LIST

## TASK 6.1: Build menus list page

**Do:** Create `app/menus/page.jsx` — same architecture as recipes list.

Grid of menu cards: cover image, name, description, recipe count, diet type badges, duration badge.
Search, filters (diet type, goal, duration, cuisine), sort.
Clean URLs: `/menus`, `/menus/[slug]`.

**Verify:** Menu cards render. Search and filters work. Mobile responsive.

---

## TASK 6.2: Build menu detail page with "Use this plan"

**Do:** Create `app/menus/[slug]/page.jsx`.

Header: cover image, name, description, creator, badges, "Use this plan" + "Add to shopping list" buttons.
Plan overview: week-at-a-glance with recipe links per day/meal.
Nutrition summary: per-day calorie/macro averages.

**"Use this plan" flow:**
1. Modal: "Which week should this start?" — date picker default next Monday
2. Copy recipes into `calendar_entries` for selected dates
3. Redirect to Planner

**Verify:** Menu renders with recipe links. "Use this plan" copies to planner correctly.

---

## TASK 6.3: Create shopping list database tables

**Do:** Create Supabase migration:

```sql
CREATE TABLE shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id),
  family_id uuid REFERENCES families(id),
  name text DEFAULT 'Shopping List',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name text,
  amount numeric,
  unit text,
  category text,
  checked boolean DEFAULT false,
  source_recipe_id uuid REFERENCES recipes(id),
  added_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

Add RLS policies. Run migration.

**Verify:** Tables exist in Supabase. RLS enabled.

---

## TASK 6.4: Build shopping list page

**Do:** Create `app/shopping-list/page.jsx`.

Grouped by food category (collapsible). Checkboxes (checked = purchased). Checked items to bottom. Manual "Add item" per group. "Share" button (generates text for SMS/WhatsApp/clipboard). "Clear checked" and "Refresh from plan" buttons.

Mobile: accessed via cart icon (🛒) in top nav. Large checkboxes, large text, one-handed use.

Family sharing: list belongs to family, any member can view/check.

**Verify:** Items grouped by category. Checkboxes persist. Share generates text. Mobile optimized.

---

## TASK 6.5: Wire entry points, update nav, commit

**Do:**
1. Recipe detail: "Add ingredients to shopping list" — merges with existing
2. Planner: "Generate shopping list for this week" — already wired in 5.7, verify
3. Cart icon in top nav with badge count
4. Update desktop nav: `[Logo] [Plan] [Recipes] [Menus] [Statistics] [🛒] [🔔] [👤]`
5. Update mobile: bottom `[Plan] [Recipes] [Menus] [Stats] [More]`, top `[Logo] [🛒] [🔔] [👤]`

```bash
git add .
git commit -m "feat: menus browsing, shopping list with family sharing"
git push
```

**Verify:** All 3 entry points work. Nav updated. Badge shows unchecked count. Build passes.

---

# SESSION 07 — STATISTICS, ACCOUNT & FAMILY

## TASK 7.1: Build statistics family dashboard

**Do:** Create `app/statistics/page.jsx`.

Default: family dashboard. Each member as a card showing:
- Name, this-week % of targets met, progress bar
- Highlights: top nutrients ✓ and warning nutrients ⚠️

Time range selector: This week, Last 7 days, Last 30 days, Custom.

Data source: reads `personal_nutrition` from `calendar_entries` and `nutrition` from `food_journal`. Does NOT calculate — only reads and sums.

**Verify:** Member cards render with real data. Time range changes results.

---

## TASK 7.2: Build statistics individual detail

**Do:** Tap member card → drill down:
- Daily/weekly macro chart (cal/protein/carbs/fat over time)
- Nutrient completeness bars (all 47, color-coded)
- Deficiency flags (<70%) and excess flags (>150%)
- Activity correlation insight
- Weight trend chart (from measurements)

Toggle: "Family view" / "Individual view"

**Verify:** Drill-down shows individual data. Charts render. Toggle switches views.

---

## TASK 7.3: Build actionable insights

**Do:** At top of family dashboard, one insight card:

Logic: find the nutrient with longest streak below 70% across family. Surface it with recipe link:
"💡 Your family has been below 70% on Vitamin D for 3 weeks. [See 5 recipes high in Vitamin D →]"

Links to recipe list filtered by nutrient.

**Verify:** Insight generates from real data. Link filters recipes correctly.

---

## TASK 7.4: Build My Profile page

**Do:** Create `app/my-account/page.jsx`.

Sections:
- Weight & Measurements (prominent): current weight large, sparkline, "Log weight" button, history
- Personal Info: name, email (read-only), DOB, gender, avatar
- Dietary Preferences: type selector, allergy chips
- Goals: primary goal selector
- Activity Template: default weekly schedule
- Preferences: units (metric/imperial), theme (light/dark/system)
- Subscription: current plan, manage via Stripe portal, upgrade button
- Account: change password, export data (GDPR), delete account (GDPR)

**Verify:** Weight logging works. Preferences save. Subscription section shows correct tier.

---

## TASK 7.5: Create family database tables

**Do:** Create Supabase migration:

```sql
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE family_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'co-admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(family_id, profile_id)
);

CREATE TABLE managed_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  managed_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  date_of_birth date,
  gender text,
  allergies text[] DEFAULT '{}',
  activity_profiles jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES profiles(id),
  email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);
```

Add RLS policies for all tables. Run migration.

**Verify:** All 4 tables exist. RLS enabled. Policies allow family members to read family data.

---

## TASK 7.6: Build My Family page

**Do:** Create `app/my-family/page.jsx`.

**Admin view:** Family header, member list (linked + managed), actions:
- "+ Invite family member" (email invite)
- "+ Add child" (managed member)
- Promote to co-admin
- Remove member

**Linked member view:** See roster, "Leave family" option.

**No family:** "Create a family" or "Enter invite code" options.

**Invite flow:**
1. Admin enters email → create pending invite → send email
2. Recipient clicks → creates account → auto-joins
3. Prompted to complete profile

**Verify:** Create family works. Invite creates record. Co-admin promotion works.

---

## TASK 7.7: Build nutritionist link

**Do:**
1. In My Profile: "Connect a nutritionist" section (enter email/code)
2. Create `app/nutritionist/page.jsx` — dashboard for nutritionists
3. Shows linked clients (families/individuals)
4. Read-only view of client stats and plans
5. Notes: nutritionist leaves notes visible in client's Statistics

**Verify:** Link/unlink works. Nutritionist sees client data (read-only). Notes appear in client stats.

---

## TASK 7.8: Verify all flows, RLS, commit

**Do:**
1. Test: create family → invite → join → shared data visible
2. Test: nutritionist link → view client → leave note
3. Verify RLS on all new tables
4. Run build

```bash
git add .
git commit -m "feat: statistics, my profile, my family, nutritionist link"
git push
```

**Verify:** All flows work. Build passes. Git pushed.

---

# SESSION 08 — ADMIN, BLOG, PRICING & SEO

## TASK 8.1: Build admin dashboard

**Do:** Create `app/admin/page.jsx` — protected by super_admin role.

Tabs: Overview (user counts, DAU sparkline, recipes today, families, subscription breakdown), Users (searchable list, edit role/tier/status), Audit Log (filterable), GDPR (export/deletion queue).

Copy logic from old `src/views/AdminDashboard.jsx`, adapt to Next.js. Functional, not pretty.

**Verify:** Only super_admin can access. Stats render. User search works.

---

## TASK 8.2: Build blog list and detail pages

**Do:**
- `app/blog/page.jsx` — SSR grid of post cards (image, title, excerpt, date, categories), category filters, pagination
- `app/blog/[slug]/page.jsx` — SSR full article, cover image, categories, content rendered from `blog_posts.content`
- Contextual CTA at bottom based on post category
- Related posts (same category)
- Article JSON-LD

Clean URLs: `/blog/[slug]`

**Verify:** SSR works. JSON-LD in source. CTA renders. Mobile responsive.

---

## TASK 8.3: Build blog editor and CMS pages

**Do:**
- Blog editor at `/blog/new` and `/blog/[slug]/edit` (admin only)
- Title, auto-slug, excerpt, content (rich text/markdown), cover image, categories, publish/draft, SEO fields
- CMS pages: `app/pages/[slug]/page.jsx` — SSR from `pages` table
- Privacy Policy, Terms of Service

**Verify:** Create/edit posts works. CMS pages render. Admin-only access enforced.

---

## TASK 8.4: Build pricing page with Stripe

**Do:** Create `app/pricing/page.jsx`.

3 plan cards with full feature lists. Monthly/annual toggle (show savings). Family plan highlighted. Comparison callout. Promotional banner if active.

FAQ below plans.

Stripe: "Start Pro"/"Start Family Plan" → Stripe Checkout session. "Manage subscription" → Stripe Customer Portal.

**Verify:** All 3 tiers correct. Toggle switches prices. Stripe checkout initiates.

---

## TASK 8.5: Implement SEO infrastructure

**Do:**
1. Every page: unique `<title>`, `<meta description>`, OpenGraph, Twitter cards, canonical URL
2. Slug generation utility (lowercase, hyphens, dedup, uniqueness check)
3. `app/sitemap.js` — dynamic, includes all public recipes, menus, blog posts, CMS pages
4. `app/robots.js` — allow all, disallow `/admin`, `/my-account`, `/my-family`, `/plan`, `/statistics`, `/onboarding`
5. All images via `next/image` with proper alt text
6. Home JSON-LD: Organization + WebSite + WebPage

**Verify:** Sitemap at `/sitemap.xml` has entries. Robots.txt blocks private routes.

---

## TASK 8.6: Verify meta, JSON-LD, commit

**Do:**
1. Check all public pages have unique titles and descriptions
2. Recipe pages: Recipe JSON-LD
3. Blog pages: Article JSON-LD
4. Home: Organization JSON-LD

```bash
git add .
git commit -m "feat: admin, blog, pricing, SEO infrastructure"
git push
```

**Verify:** All JSON-LD present in page source. Build passes.

---

# SESSION 09 — POLISH & PRODUCTION DEPLOY

## TASK 9.1: Full user flow test — visitor to shopping list

**Do:** Test end-to-end:
1. Landing page (logged out) → CTA → onboarding quiz (add 2-3 members) → sample meal preview → create account → profile + family created
2. Recipes → generate recipe → image appears → save → recipe list → detail page
3. Planner → add recipes to 3 days → add journal entries → add activities → Day Summary correct
4. Generate shopping list → ingredients aggregated and deduplicated

Fix anything broken.

**Verify:** Entire flow works without errors.

---

## TASK 9.2: Full user flow test — family, menus, nutritionist, subscription

**Do:** Test:
1. My Family → invite member → join from new account → sees existing plan
2. Menus → browse → "Use this plan" → recipes in planner
3. Nutritionist link → connect → nutritionist sees client → leaves note → note visible
4. Subscription: exceed free limits → upgrade prompt → Stripe checkout (test mode)

Fix anything broken.

**Verify:** All flows complete without errors.

---

## TASK 9.3: Mobile testing

**Do:** Test at 375px (Chrome DevTools):
- Bottom nav: 5 tabs clean, active state visible
- Top bar: logo, cart, notification, avatar tappable
- Landing page: all sections stack, readable
- Onboarding: forms usable, keyboard doesn't overlap
- Planner: date strip swipeable, agenda scrollable
- Recipe detail: nutrition disclosure works with tap
- Shopping list: large checkboxes, one-handed

Fix any issues.

**Verify:** All pages work at 375px width.

---

## TASK 9.4: Performance audit

**Do:** Run Lighthouse on home, recipes, pricing pages (or check manually for common issues):
- Missing alt text → add
- Missing meta descriptions → add
- Slow LCP → check hero image
- CLS → check font loading, dynamic content

Target: Performance >90, Accessibility >90, Best Practices >90, SEO >95.

**Verify:** Major Lighthouse issues fixed.

---

## TASK 9.5: SEO verification

**Do:** Check:
- Every public page: unique title + meta description
- Recipe pages: Recipe JSON-LD
- Blog pages: Article JSON-LD
- `/sitemap.xml` has all public content
- `/robots.txt` blocks private routes
- Canonical URLs on all pages

**Verify:** All SEO elements present and correct.

---

## TASK 9.6: Knowledge consolidation and SYSTEM.md final update

**Do:**
1. Run `knowledge/prompts/consolidate.md` process
2. Review all session files, merge into patterns/conventions
3. Update SYSTEM.md to reflect final v2 architecture:
   - Updated repo structure (no src/)
   - New database tables
   - Updated pricing
   - Updated nav
   - Updated file organization
   - Remove all Vite/React Router DOM references

**Verify:** SYSTEM.md is comprehensive and accurate. Knowledge files consolidated.

---

## TASK 9.7: Final commit, deploy, verify test URL

**Do:**
```bash
git add .
git commit -m "feat: MintyFit v2 complete - ready for production"
git push
vercel --prod
```

Open test URL. Click through all major pages.

**Verify:** Test URL works end-to-end. No console errors. All pages load.

---

## TASK 9.8: Switch production domain

**Do:**
1. Vercel: remove `mintyfit.com` from old project, add to new project
2. Verify SSL
3. Update Stripe webhook endpoint URL
4. Verify Supabase Auth redirect URLs include `https://mintyfit.com`
5. Verify Google OAuth redirect URIs
6. Submit sitemap to Google Search Console
7. Rename old repo to `mintyfit-v1-archive`

**Verify:** `mintyfit.com` loads new v2 app. SSL active. Stripe webhooks working. OAuth working.

**When this task is done: CREATE OVERNIGHT-COMPLETE.md and STOP.**
