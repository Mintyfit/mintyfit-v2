# Session 07 + 09 Findings — 2026-04-09

## What Was Built

### Session 07: Statistics, Account & Family Management
- 40 routes total in final build (up from 25 after session 06)
- All 8 session 07 tasks completed in one session

### Files Created
**Statistics:**
- `app/statistics/page.jsx` — Server Component, fetches 7-day calendar + journal + weight + nutritionist notes
- `components/statistics/StatisticsClient.jsx` — Family dashboard (member completeness cards), InsightCard, IndividualDetail (macro donut SVG, weight sparkline, 47 nutrient bars)

**My Account:**
- `app/my-account/page.jsx` — Server Component with weight history, active nutritionist link
- `components/account/MyAccountClient.jsx` — Weight logging, dietary prefs toggle chips, nutritionist connect/disconnect, GDPR export/delete, subscription section

**My Family:**
- `app/my-family/page.jsx` — Server Component: family, memberships, managed_members, invites
- `components/family/MyFamilyClient.jsx` — Create family, invite members via link (not email), manage roles, add managed children via AddChildModal
- `app/family-invite/[token]/page.jsx` — Invite acceptance page
- `components/family/FamilyInviteClient.jsx` — Shows family name, join button (logged in) or sign-in/register links

**Nutritionist:**
- `app/nutritionist/page.jsx` — Server Component, role guard (redirects non-nutritionists)
- `components/nutritionist/NutritionistClient.jsx` — ClientCard with avg calories, last activity, notes inline

**API Routes (all Session 07):**
- `/api/profile` PATCH — whitelisted fields only
- `/api/weight` POST/GET — weight_logs table with date conflict upsert
- `/api/family/create` POST
- `/api/family/invite` POST/GET
- `/api/family/accept-invite` POST — validates token, joins family, marks invite accepted
- `/api/family/members` PATCH/DELETE
- `/api/family/managed` POST/PATCH/DELETE
- `/api/nutritionist/connect` POST/DELETE
- `/api/nutritionist/notes` POST
- `/api/gdpr/export` GET — streams JSON download of all user data
- `/api/gdpr/delete` DELETE — cascading delete + auth.admin.deleteUser()

**DB Migration:**
- `supabase/migrations/20260409_family_tables.sql` — families, family_memberships, managed_members, family_invites, weight_logs

## Key Technical Decisions

### Family Invite Flow
- Invite generates a token via `gen_random_bytes(32)` in SQL (auto-default)
- Invite URL: `${NEXT_PUBLIC_APP_URL}/family-invite/${token}`
- No email sending implemented — user copies the link manually (future: Resend integration)
- Invite page handles: not logged in → show sign-in/register, already in family → error, valid → join button

### GDPR Delete Cascade Order
1. calendar_entries, journal_entries (child data)
2. weight_logs
3. managed_members
4. family_memberships, family_invites (where invited_by = uid)
5. nutritionist links and notes (both sides of relationship)
6. meal_plans
7. profiles
8. auth.admin.deleteUser() — requires SUPABASE_SERVICE_ROLE_KEY

### Statistics SVG Charts
Using inline SVG (no chart library) for:
- Macro donut chart: simple circle segments via stroke-dasharray
- Weight sparkline: polyline on a 200×60 viewBox
Keeps bundle size down, no dependency needed.

### NutritionBar Thresholds
- Green: ≥ 100% of daily target
- Amber: ≥ 70%
- Red: < 70%
InsightCard flags the nutrient with the most days below 70% in the last 7 days.

## Session 09 Audit Findings

### Robots.txt Fix
Added missing disallowed routes: `/nutritionist`, `/shopping-list`, `/family-invite/`
These are authenticated pages that should not be indexed.

### SEO Status
- All 40 pages have `export const metadata`
- Recipe pages: Recipe JSON-LD (app/recipes/[slug]/page.jsx:103)
- Blog pages: Article JSON-LD (app/blog/[slug]/page.jsx:73)
- Sitemap: includes recipes, blog, menus, CMS pages — dynamically generated
- metadataBase set to `https://mintyfit.com` in layout.jsx

### Mobile Status
- Bottom nav: 5 tabs with safe-area-inset-bottom for iPhone notch
- All new components: `padding: '24px 16px 80px'` for bottom nav clearance
- .hide-mobile / .show-mobile CSS utilities in globals.css
- AppNav: hamburger menu on mobile, bottom tab bar below

### NEXT_PUBLIC_APP_URL
Required for family invite URL generation in `/api/family/invite/route.js`.
Must be added to Vercel environment variables before invite links work in production.

## What's NOT Done (Deferred to Post-Launch)
- Email sending for family invites (Resend integration)
- Nutritionist invite flow from nutritionist side
- Push notifications
- Mobile app (PWA or React Native)
- Wearable integration
