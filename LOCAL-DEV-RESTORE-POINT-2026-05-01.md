# Local Dev Restore Point - 2026-05-01

This is a snapshot of the active local MintyFit development setup. It is not just a Git restore point. Use this file to understand what was running locally, which files existed outside Git, which tracked files had local changes, and how the dev server was configured at the time of the snapshot.

## Snapshot Identity

- Created: 2026-05-01, Europe/Tallinn timezone
- Active local project root: `D:\WORKS\Minty\NewMintyAprill2026\AprillBuild`
- Codex worktree copy seen separately: `C:\Users\ronal\.codex\worktrees\a83d\AprillBuild`
- Project/package name: `mintyfit-v2`
- Package version: `2.0.0`
- Current session marker in local project: `08`
- Local Git branch: `v2-preview`
- Local HEAD commit: `e91eba5e73b4871697d9c62862650c82884487d6`
- Local HEAD summary: `e91eba5 fix: new nav with Recipes, Menus, Plan, Shopping, Stats, Blog links for all users`
- Remote repository: `https://github.com/Mintyfit/mintyfit-v2.git` (credential redacted)

## What Matters For Restore

This local setup is dirty and active. A plain `git checkout` or `git reset` would not restore it.

At snapshot time:

- `node_modules` exists locally.
- `.next` exists locally.
- `.env.local` exists locally.
- Four Next dev server processes were listening on ports `3000`, `3001`, `3002`, and `3003`.
- The active server command lines point to `D:\WORKS\Minty\NewMintyAprill2026\AprillBuild`, not the Codex worktree copy.
- There were 6 modified tracked files.
- There were 115 untracked files.

## Runtime

- Node.js: `v24.13.1`
- npm: `11.8.0`
- Next.js actually installed in `node_modules`: `15.5.14`
- React actually installed in `node_modules`: `19.2.4`
- React DOM actually installed in `node_modules`: `19.2.4`

## Local Environment File

File present:

- `.env.local`
- Size: `1425` bytes
- Last modified: `2026-04-28 18:38:11`

Environment variable names present, values intentionally omitted:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
XAI_API_KEY
IDEOGRAM_API_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
OPENAI_API_KEY
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
RESEND_FROM
```

## Dev Servers Running

Listening ports at snapshot:

```text
3000 -> node process 18680
3001 -> node process 21012
3002 -> node process 26828
3003 -> node process 28212
```

Observed process command lines:

```text
npm run dev
next dev
npm run dev
next dev
npm run dev -- --port 3002
next dev --port 3002
npm run dev
next dev
```

All observed `next dev` process paths pointed into:

```text
D:\WORKS\Minty\NewMintyAprill2026\AprillBuild\node_modules
```

Local URL health check at snapshot:

```text
http://localhost:3000 -> 500 Internal Server Error
http://localhost:3001 -> timed out
http://localhost:3002 -> 200 OK
http://localhost:3003 -> 200 OK
```

The most useful currently healthy local URLs are:

```text
http://localhost:3002
http://localhost:3003
```

## Dev Logs Present

Local dev log files present:

```text
.codex-dev.log
.codex-dev.err.log
.codex-dev-3002.log
.codex-dev-3002.err.log
```

Recent `.codex-dev-3002.log` state:

```text
mintyfit-v2@2.0.0 dev
next dev --port 3002
Next.js 15.5.14
Local: http://localhost:3002
Environments: .env.local
Ready in 1455ms
GET /statistics 200
```

Recent `.codex-dev.log` showed successful responses for:

```text
/my-family
/statistics
/recipes
/recipes/[slug]
/blog
```

It also showed a missing `manifest.json` returning `404`.

## Package Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## Installed Top-Level Packages

`npm ls --depth=0` succeeded in the active local project. Installed top-level packages:

```text
@stripe/stripe-js@8.11.0
@supabase/ssr@0.6.1
@supabase/supabase-js@2.101.1
@tailwindcss/postcss@4.2.2
@types/dompurify@3.0.5
@types/node@22.19.17
@types/react-dom@19.2.3
@types/react@19.2.14
dompurify@3.3.3
eslint-config-next@15.5.14
eslint@9.39.4
globals@17.4.0
lucide-react@0.574.0
next@15.5.14
react-dom@19.2.4
react@19.2.4
sharp@0.34.5
stripe@20.4.1
tailwindcss@4.2.2
```

Extraneous top-level packages also present:

```text
@emnapi/core@1.9.2
@emnapi/runtime@1.9.2
@emnapi/wasi-threads@1.2.1
@napi-rs/wasm-runtime@0.2.12
@stablelib/base64@1.0.1
@tybys/wasm-util@0.10.1
fast-sha256@1.3.0
postal-mime@2.7.4
resend@6.12.2
standardwebhooks@1.0.0
svix@1.90.0
uuid@10.0.0
```

## Modified Tracked Files

`git diff --stat` at snapshot:

```text
app/globals.css                            |  19 +
app/layout.jsx                             |  13 +-
app/statistics/page.jsx                    | 165 +++---
components/landing/AuthModal.jsx           |  30 +
components/statistics/StatisticsClient.jsx | 910 ++++++++++++++++-------------
lib/supabase/client.js                     |   8 +-
6 files changed, 657 insertions(+), 488 deletions(-)
```

Modified tracked file list:

```text
app/globals.css
app/layout.jsx
app/statistics/page.jsx
components/landing/AuthModal.jsx
components/statistics/StatisticsClient.jsx
lib/supabase/client.js
```

Git warned that these files may be normalized from LF to CRLF next time Git touches them:

```text
app/layout.jsx
app/statistics/page.jsx
components/statistics/StatisticsClient.jsx
```

## Untracked Files

There were 115 untracked files at snapshot:

```text
.claude/settings.json
.codex-dev-3002.err.log
.codex-dev-3002.log
.codex-dev.err.log
.codex-dev.log
.playwright-mcp/console-2026-04-29T19-17-51-327Z.log
.playwright-mcp/page-2026-04-29T19-17-52-664Z.yml
.playwright-mcp/page-2026-04-29T19-17-57-495Z.png
AGENTS.md
Activity Trackerc.txt
BLOG_DISPLAY_FIXES.md
BLOG_EDITOR_AND_NAV_FIXES.md
BLOG_EDITOR_FIX.md
BLOG_MIGRATION.md
BLOG_POST_PAGE_FIX.md
BLOG_SEO_IMPLEMENTATION.md
BLOG_UPDATES.md
FIX-HAIKU-A.md
FIX-HAIKU-B.md
FIX-HAIKU-C.md
FIX-PHASE-1.md
FIX-PHASE-2.md
FIX-PHASE-3.md
FIX_FAMILY_RLS.md
TASKS-FOR-QWEN.md
app/admin/approvals/actions.js
app/admin/approvals/page.jsx
app/admin/audit/page.jsx
app/admin/customers/[id]/page.jsx
app/admin/customers/actions.js
app/admin/customers/page.jsx
app/admin/families/[id]/page.jsx
app/admin/families/actions.js
app/admin/families/page.jsx
app/admin/gdpr/actions.js
app/admin/gdpr/page.jsx
app/admin/import-plan/ImportPlanClient.jsx
app/admin/import-plan/page.jsx
app/admin/layout.jsx
app/admin/nutritionists/actions.js
app/admin/nutritionists/page.jsx
app/api/account/family/route.js
app/api/account/measurements/route.js
app/api/admin/import-plan/import/route.js
app/api/admin/import-plan/parse/route.js
app/api/avatar/upload/route.js
app/api/nutritionist/accept-invite/route.js
app/api/nutritionist/apply/route.js
app/api/nutritionist/invite/route.js
app/api/recipe/fork/route.js
app/auth/callback/route.js
app/become-a-nutritionist/page.jsx
app/client-providers.jsx
app/error.jsx
app/loading.jsx
app/login/page.jsx
app/not-found.jsx
app/nutritionist-invite/[token]/page.jsx
build-output.txt
components/Navbar.jsx
components/account/BecomeNutritionistClient.jsx
components/account/FamilySection.jsx
components/account/MeasurementForm.jsx
components/account/MemberCard.jsx
components/account/NutritionistLinkStatus.jsx
components/account/ProfileSection.jsx
components/account/SubscriptionCard.jsx
components/admin/AdminTabs.jsx
components/admin/InlineSelect.jsx
components/blog/BlogContent.jsx
components/blog/BlogPostHeader.jsx
components/calculators/BlogCalculatorEmbed.jsx
components/calculators/README.md
components/calculators/VitaminD3Calculator.jsx
components/calculators/WaterCalculator.jsx
components/calculators/index.js
components/nutritionist/NutritionistInviteClient.jsx
components/planner/DayMacroBreakdown.jsx
components/planner/MonthView.jsx
components/recipes/SwapPopup.jsx
components/shared/NavbarWrapper.jsx
knowledge/sessions/2026-04-22-theme-toggle-runtime-fix.md
knowledge/sessions/activity-nutrient-expenditure-study.md
lib/admin/audit.js
lib/email/sendEmail.js
lib/email/templates.js
lib/nutrition/activityNutrientLoss.js
lib/nutrition/dailyTotals.js
public/calculators/magnesium-calc.html
public/calculators/vitamin-d3-calculator-7.html
public/calculators/water-intake-calculator8.html
public/favicon-192.png
public/favicon.ico
public/fonts/montserrat-300-700-latin-ext.woff2
public/fonts/montserrat-300-700-latin.woff2
public/fonts/montserrat.css
public/images/Mintyfit.svg
public/images/MintyfitWhite.svg
supabase/migrations/20260410_blog_posts.sql
supabase/migrations/20260410_recipe_slugs.sql
supabase/migrations/20260427_calendar_entries_recipe_fk.sql
supabase/migrations/20260428_add_seo_fields.sql
supabase/migrations/20260428_blog_full_schema.sql
supabase/migrations/20260428_invites_and_nutritionist_apply.sql
supabase/migrations/20260430_00_drop_all_family_policies.sql
supabase/migrations/20260430_01_simple_fix.sql
supabase/migrations/20260430_99_debug_policies.sql
supabase/migrations/20260430_99_debug_triggers.sql
supabase/migrations/20260430_99_test_manual.sql
supabase/migrations/20260430_add_membership_status.sql
supabase/migrations/20260430_disable_old_member_system.sql
supabase/migrations/20260430_final_fix.sql
supabase/migrations/20260430_fix_family_recursion.sql
supabase/migrations/20260430_fix_invite_accept.sql
supabase/migrations/20260430_revert_disable_member_system.sql
```

## Top-Level Local Files And Directories

Important local-only directories present:

```text
.next
.playwright-mcp
.vercel
node_modules
```

Project directories present:

```text
.claude
app
components
contexts
hooks
knowledge
lib
public
supabase
```

Notable local docs and logs present at root:

```text
Activity Trackerc.txt
AGENTS.md
BLOG_DISPLAY_FIXES.md
BLOG_EDITOR_AND_NAV_FIXES.md
BLOG_EDITOR_FIX.md
BLOG_MIGRATION.md
BLOG_POST_PAGE_FIX.md
BLOG_SEO_IMPLEMENTATION.md
BLOG_UPDATES.md
BUILD-FIXES.md
FIX-HAIKU-A.md
FIX-HAIKU-B.md
FIX-HAIKU-C.md
FIX-PHASE-1.md
FIX-PHASE-2.md
FIX-PHASE-3.md
FIX_FAMILY_RLS.md
TASKS-FOR-QWEN.md
build-output.txt
```

## Recent Local Git Commits

These are context only. They do not fully represent the local dev state because of the modified and untracked files above.

```text
e91eba5 fix: new nav with Recipes, Menus, Plan, Shopping, Stats, Blog links for all users
f62d8a6 fix: remove loading check from Navbar, update BUILD-FIXES.md
2d4fc8e doc: add BUILD-FIXES.md documenting all fixes
1f8e59e fix: hydration errors - theme context starts undefined, Navbar waits for theme load
77febed fix: restore AuthContext with getSession, profile fetch, auth functions; restore nav in layout
```

## Practical Restore Checklist

If we need to get back to this local development state:

1. Use the active project folder:

```powershell
cd D:\WORKS\Minty\NewMintyAprill2026\AprillBuild
```

2. Confirm local environment file exists:

```powershell
Test-Path .env.local
```

3. Reinstall dependencies only if `node_modules` is missing or broken:

```powershell
npm install
```

4. Start a known-good dev server port:

```powershell
npm run dev -- --port 3002
```

5. Open:

```text
http://localhost:3002
```

6. If checking whether the local state still matches this snapshot, compare:

```powershell
git status --short --branch
git diff --stat
npm ls --depth=0
```

## Important Caution

This markdown records the state, but it is not a full file backup. The local work includes many untracked files and local modifications. To make this restore point truly reversible, create a filesystem copy or archive of:

```text
D:\WORKS\Minty\NewMintyAprill2026\AprillBuild
```

Exclude `node_modules` and `.next` only if you are comfortable restoring them with `npm install` and `npm run dev`.
