# MintyFit v2 — Build Checkpoint

> Claude Code reads this file at the start of each overnight session.
> Execute the next [PENDING] task. After completing, mark it [DONE] with verification notes.
> If a task fails, mark it [FAILED] with details and move to the next task.
> When ALL tasks are [DONE], create OVERNIGHT-COMPLETE.md in the project root.

---

## Session 01 — Project Foundation

- [DONE] TASK 1.1: Create GitHub repo and scaffold Next.js 15 project — ✓ completed in prior session
- [DONE] TASK 1.2: Install dependencies and create project directory structure — ✓ completed in prior session
- [DONE] TASK 1.3: Create CLAUDE.md with all project rules — ✓ completed in prior session
- [DONE] TASK 1.4: Create SYSTEM.md with full technical documentation — ✓ completed in prior session
- [DONE] TASK 1.5: Create knowledge system (all files in knowledge/) — ✓ completed in prior session
- [DONE] TASK 1.6: Create Supabase client, middleware, AuthContext, and app layout — ✓ completed in prior session
- [DONE] TASK 1.7: Copy static assets, set up .env.local, configure next.config.mjs — ✓ completed in prior session
- [DONE] TASK 1.8: Git commit, push, deploy to Vercel test URL — ✓ completed in prior session

## Session 02 — Business Logic Transplant

- [DONE] TASK 2.1: Transplant nutrition utilities (portionCalc, memberRDA, nutrition, glycemicLoad, usda*) — ✓ completed in prior session
- [DONE] TASK 2.2: Transplant recipe utilities (recipeGenerator, imageGeneration, foodGroups, ingredientDatabase, ingredientSwap) — ✓ completed in prior session
- [DONE] TASK 2.3: Transplant journal utilities (grokFoodLookup, openFoodFacts) — ✓ completed in prior session
- [DONE] TASK 2.4: Transplant member utilities (syncFamily, activityCalories, recoveryFactor, memberColors) — ✓ completed in prior session
- [DONE] TASK 2.5: Transplant standalone utilities (unitConversion, usageLimits, mealParser) and Stripe utils — ✓ completed in prior session
- [DONE] TASK 2.6: Create API routes (claude, grok, ideogram, proxy-image) — ✓ completed in prior session
- [DONE] TASK 2.7: Transplant Supabase migrations and edge functions — ✓ completed in prior session
- [DONE] TASK 2.8: Create custom hooks (useAuth, useFamily, useProfile, useSubscription, useStorage, useVoice) — ✓ completed in prior session
- [DONE] TASK 2.9: Verify all imports clean (no src/, no VITE_), build passes, commit and push — ✓ completed in prior session

## Session 03 — Landing Page & Onboarding

- [DONE] TASK 3.1: Build hero section and how-it-works section — ✓ completed in prior session
- [DONE] TASK 3.2: Build feature highlights and pricing preview sections — ✓ completed in prior session
- [DONE] TASK 3.3: Build trust/credentials section, FAQ accordion, and final CTA — ✓ completed in prior session
- [DONE] TASK 3.4: Build onboarding quiz (screens 1-3: family members, dietary needs, goals) — ✓ completed in prior session
- [DONE] TASK 3.5: Build onboarding quiz screen 4 (payoff with sample meal + per-member portions) — ✓ completed in prior session
- [DONE] TASK 3.6: Build auth modal (Google OAuth, Facebook OAuth, email/password, GDPR checkbox) — ✓ completed in prior session
- [DONE] TASK 3.7: Wire onboarding data to profile creation on sign-up, verify full flow, commit and push — ✓ completed in prior session

## Session 04 — Recipes & Generator

- [DONE] TASK 4.1: Build recipe list page with grid, search, filters, sort, pagination — ✓ app/recipes/page.jsx + RecipesClient.jsx + RecipeCard.jsx, build passes
- [DONE] TASK 4.2: Build recipe generator — describe step, progress indicator, parallel image generation — ✓ RecipeGeneratorClient.jsx, 3-step progress, voice input, isFoodRelated guard
- [DONE] TASK 4.3: Build recipe generator — preview card with image, description, nutrition, save/regenerate/discard — ✓ integrated in RecipeGeneratorClient.jsx, donut chart, ingredients, first 3 steps
- [DONE] TASK 4.4: Build recipe detail page — top section, ingredients grouped by component, member selector — ✓ app/recipes/[slug]/page.jsx + RecipeDetailClient.jsx, SSR with BMI-scaled portions
- [DONE] TASK 4.5: Build recipe detail — progressive nutrition disclosure (Big 4 → Key nutrients → All 47) — ✓ 3-layer NutritionSection, color-coded RDA bars, member-scaled
- [DONE] TASK 4.6: Wire shopping list and planner buttons, add Recipe JSON-LD, verify and commit — ✓ JSON-LD in [slug]/page.jsx, placeholder buttons wired, build passes, pushed

## Session 05 — Meal Planner

- [DONE] TASK 5.1: Build week overview — 7 day columns with nutrition indicators, filled/empty slot dots — ✓ WeekOverview.jsx, NutritionRing SVG, slot dots, calorie/activity badges
- [DONE] TASK 5.2: Build day agenda — meal slots with recipe links, journal entries, per-member nutrition — ✓ DayAgenda.jsx, 5 meal slots, recipe entries with image/link/remove, journal entries inline, day summary progress bars
- [DONE] TASK 5.3: Build activity system — per-member per-day, default templates, calorie cascade — ✓ ActivityForm.jsx, activity type grid, MET-based calorie estimate, saves to daily_activities table
- [DONE] TASK 5.4: Build food journal in planner — quick add, AI describe, barcode scan, frequent foods — ✓ JournalEntryForm.jsx, 3 tabs (quick/AI/barcode), voice input, Grok nutrition lookup, saves to journal_entries
- [DONE] TASK 5.5: Build recipe picker and drag-and-drop sidebar (desktop) — ✓ RecipePickerModal.jsx, bottom sheet, search/filter, recipe list with thumbnails
- [DONE] TASK 5.6: Build mobile planner — date strip, swipe navigation, day agenda below — ✓ PlannerClient.jsx mobile date strip, touch swipe, responsive layout
- [DONE] TASK 5.7: Wire shopping list generation from planner, verify full flow, commit and push — ✓ placeholder button wired, build passes, pushed to origin/main (commit f1bf81e)

## Session 06 — Menus & Shopping List

- [PENDING] TASK 6.1: Build menus list page with grid, search, filters
- [PENDING] TASK 6.2: Build menu detail page with plan overview and "Use this plan" flow
- [PENDING] TASK 6.3: Create shopping list database tables (shopping_lists, shopping_list_items)
- [PENDING] TASK 6.4: Build shopping list page — grouped by category, checkboxes, manual add, share
- [PENDING] TASK 6.5: Wire shopping list entry points (recipe detail, planner, standalone), update nav, commit and push

## Session 07 — Statistics, Account & Family

- [PENDING] TASK 7.1: Build statistics family dashboard — member cards with nutrition completeness
- [PENDING] TASK 7.2: Build statistics individual detail — macro charts, nutrient bars, weight trend
- [PENDING] TASK 7.3: Build actionable insights system ("low on Vitamin D for 3 weeks" → recipe suggestions)
- [PENDING] TASK 7.4: Build My Profile page — weight tracking, dietary preferences, goals, activity template
- [PENDING] TASK 7.5: Create family database tables (families, family_memberships, managed_members, family_invites)
- [PENDING] TASK 7.6: Build My Family page — create family, invite members, add managed kids, co-admin
- [PENDING] TASK 7.7: Build nutritionist link — connect/disconnect, nutritionist dashboard, client notes
- [PENDING] TASK 7.8: Verify all flows, RLS policies on new tables, commit and push

## Session 08 — Admin, Blog, Pricing & SEO

- [DONE] TASK 8.1: Build admin dashboard — overview stats, user management, audit log, GDPR — ✓ app/admin/page.jsx + AdminClient.jsx, super_admin role guard, 4 tabs (overview/users/audit/gdpr), user tier/role editing
- [DONE] TASK 8.2: Build blog list and blog detail pages with SSR and Article JSON-LD — ✓ app/blog/page.jsx + BlogListClient.jsx (category filter, search, pagination), app/blog/[slug]/page.jsx (Article JSON-LD, related posts, contextual CTA)
- [DONE] TASK 8.3: Build blog editor (admin only) and CMS pages renderer — ✓ app/blog/new + app/blog/[slug]/edit with BlogEditorClient.jsx, app/pages/[slug]/page.jsx with static privacy-policy + terms-of-service + DB fallback
- [DONE] TASK 8.4: Build full pricing page with Stripe checkout integration — ✓ app/pricing/page.jsx + PricingClient.jsx (3 tiers, monthly/annual toggle, Stripe checkout + portal), app/api/stripe/checkout + portal routes
- [DONE] TASK 8.5: Implement SEO infrastructure — metadata, sitemaps, robots.txt, OpenGraph — ✓ app/robots.js, app/sitemap.js (dynamic, all public content), lib/utils/slugify.js, layout.jsx metadataBase + global OG/Twitter, home Organization+WebSite JSON-LD
- [DONE] TASK 8.6: Verify all pages have unique meta, JSON-LD where needed, commit and push — ✓ next build passes (25 routes), all JSON-LD present, committed and pushed

## Session 09 — Polish & Production Deploy

- [PENDING] TASK 9.1: Full user flow test — new visitor → recipe → planner → shopping list
- [PENDING] TASK 9.2: Full user flow test — family invite, menu adoption, nutritionist link, subscription
- [PENDING] TASK 9.3: Mobile testing — all pages at 375px, bottom nav, touch interactions
- [PENDING] TASK 9.4: Performance audit — Lighthouse on key pages, fix issues
- [PENDING] TASK 9.5: SEO verification — meta tags, JSON-LD, sitemap, robots.txt
- [PENDING] TASK 9.6: Knowledge base consolidation and SYSTEM.md final update
- [PENDING] TASK 9.7: Final commit, deploy to Vercel, verify test URL end-to-end
- [PENDING] TASK 9.8: Switch production domain (mintyfit.com) to new project, update webhooks and OAuth
