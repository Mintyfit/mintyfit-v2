# 2026-10-15 — SEO keyword strategy + weekly SEO report system (ported from SPS)

## What happened

1. **Keyword research** (live SERP validation, English/global): food head terms are unwinnable, but the *family practical* space is weak — picky-eater meal plans, theme-night dinners, budget meal plans, printable templates, and tool queries are all dominated by small blogs/indie apps. Kids' nutrient-RDA queries are YMYL (Mayo/CDC/AAP) → explicitly dropped; PN1 coaching cert is enough for lifestyle content but NOT for medical review (would need freelance pediatric RD).
2. **`SEO-STRATEGY.md`** created at repo root — single source of truth: 5 pillars (A meal-planning systems, B budget meals, C picky eaters, D tools, E commercial), out-of-scope YMYL rules, content rules (experience-first, PN1 byline, 1 post/week cadence), methodology.
3. **Weekly SEO report system ported** from `D:\WORKS\SPS\2026AprillWeb\AprilBuild` (all SPS identifiers removed): `lib/reporting/` (snapshot GSC+GA4+blog, keyword-families per pillar, rule-based insights, Anthropic narrative w/ number audit, Supabase store + JSON fallback, Resend notify), cron route `/api/cron/weekly-seo-report` (vercel.json, Fri 06:00 UTC), admin UI `/admin/seo-reports` (+ detail, generate-now, delete, resend, recipients manager).
4. **Separate sender address**: `RESEND_FROM_REPORTS` env (own Resend account, not Claus's); `sendEmail()` gained optional `from` param.

## Issues found during verification (all fixed)

- **Number-audit false positive**: audit's allowed-sources didn't include the strategy doc — LLM legitimately cited "$50 weekly meal plan" from it and got rejected. Fix: `loadStrategy()` added to allowed sources.
- **Blog cadence insight never fired when GSC unconfigured**: `strategyInsights` early-returned on `!gsc`, skipping blog checks. Fix: blog cadence block moved outside the gsc guard.
- **Audit too strict with sparse data** (invented "12"/"13,33" on empty weeks): added one corrective retry that lists the invented numbers back to the model; second draft passed. Strictness kept — no whitelist loosening.
- **DB migration not auto-applied**: store falls back to `data/seo-weekly-reports.json` (gitignored) — works, but migration 063 must be run in Supabase SQL Editor. `Supabase_token` in `.env.local` is INVALID (401 on Management API).

## Verification evidence

- `npm run build` passes; routes `/admin/seo-reports`, `/admin/seo-reports/[id]`, `/api/cron/weekly-seo-report` all present.
- Cron smoke test (`?send=0`, prod build, port 3001): ok=true, insights=1 (cadence warning — blog silent 229 days), narrative="llm" (after retry), GSC/GA4 graceful errors, 401 without auth, admin 307-redirects to login.
- Narrative quality: correctly prioritized "configure GSC/GA4" + "resume publishing" and produced pillar/title/query-grounded content suggestions.

## Setup pending (user ops)

1. Run `supabase/migrations/063_seo_weekly_reports.sql` in Supabase SQL Editor.
2. Vercel env: `CRON_SECRET` (copy from .env.local), `GSC_SITE_URL=https://mintyfit.com/`, `GA4_PROPERTY_ID`, `GCP_SERVICE_ACCOUNT_JSON` (service account w/ GA4 Viewer + GSC user).
3. Own Resend account → verify mintyfit.com domain → `RESEND_API_KEY` + `RESEND_FROM_REPORTS`.
4. Add recipients in Admin → SEO Reports.

## GTM + GA4 on-site setup (same day, later)

- Site had **zero tracking** — the "0 sessions" in the report was real. Set up via APIs with the same service account (`seo-weekly-reporter@mintyfit.iam.gserviceaccount.com`, user granted GTM admin): GA4 web stream measurement ID `G-29ZYDDKHCN` (property 486684165); created GTM container **`GTM-NNX8XQRN`** in GTM account "Mintyfit", GA4 Configuration tag (All Pages), published as container v2. Loader: `components/shared/GoogleTagManager.jsx` (env `NEXT_PUBLIC_GTM_ID`, no-op when unset) mounted in root layout.
- **GTM API gotcha:** the create-version verb is `:create_version` (snake_case), NOT `:createVersion` — the latter 404s on both hosts. Discovery doc (`/discovery/v1/apis/tagmanager/v2/rest`) is the authoritative reference.
- **GA4 Admin API and Tag Manager API must be enabled in the GCP project by a project owner** — the service account itself gets 403 PERMISSION_DENIED on serviceusage (can't self-enable).
- GSC property is the **domain property**: `GSC_SITE_URL=sc-domain:mintyfit.com` (URL-prefix property 403s even when the domain property is shared with the SA).
- Verified: gtm.js served (354KB) contains G-29ZYDDKHCN; site HTML contains the loader + dataLayer init. Live hit flow needs a real browser visit (check GA4 Realtime after deploy).

## Rules for future sessions

- **SEO-STRATEGY.md is the source of truth** for SEO decisions; the report reads it at runtime (`outputFileTracingIncludes` in next.config.mjs bundles it into the cron function).
- The number audit is intentionally strict — do not loosen; fix data/prompt instead.
- LLM numbers must come from data/insights/strategy-doc only.
- Existing blog (D3/magnesium/FODMAPs) is off-strategy — no new investment, no deletion.
