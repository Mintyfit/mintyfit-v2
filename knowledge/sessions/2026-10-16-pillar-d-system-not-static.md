# 2026-10-16 — Pillar D reframed: showcase the system, never static artifacts

## What happened

First weekly SEO report arrived (week of Oct 6–12): 0.1 impressions/day, 0 clicks,
8 posts total — ALL 8 are the legacy adult-wellness library (D3, magnesium,
FODMAPs, bloating, stress, women-over-40, water + D3 calculators), 230 days
silent. The report's content suggestions were structurally fine (A/B/C pillars)
but Pillar D suggested a "Free Weekly Meal Planner Template (Interactive +
Printable)" with a **fillable PDF**, and Pillar A suggested a "printable
rotation calendar" — static-artifact thinking inherited from the strategy doc.

## Root cause

- `SEO-STRATEGY.md` Pillar D read "Tools (link magnets)" with target
  `weekly meal planner template` annotated "(interactive + printable)" — the
  LLM followed it straight into PDF territory.
- `lib/reporting/llm.js` claimed "tools under /calculators/ (embedded in
  posts)" — **no /calculators/ route exists** (leftover from the SPS port).
- STRATEGY_FALLBACK described Pillar A as "(theme nights, templates, how-to)".
- The report also assumed the 8 existing posts map to pillars; they don't —
  all are pre-strategy legacy wellness content.

## Fixes (this session)

- **SEO-STRATEGY.md**: Pillar D rewritten as "The system, shown working" —
  template/printable/generator queries are answered by demonstrating the live
  product (`/plan`, `/menus/`, generated grocery lists, per-person portions).
  New content **rule 9: No static artifacts, ever** (no printable PDFs,
  fillable templates, spreadsheets, email-gated files). §5 report rules:
  suggestions must develop the system; legacy posts have no pillar (no
  refreshes/interlink campaigns/pillar tags for them). Pillar A angle notes
  template demand is answered with the live planner.
- **lib/reporting/llm.js**: fallback rewritten; system prompt now lists the
  REAL product surfaces (/plan, /menus/, /recipes/, /shopping-list,
  /statistics — no /calculators/); explicit STATIC-ARTIFACT BAN; legacy-posts
  clarification; Content-suggestions format line reinforces Pillar D = live
  system, never a download.
- **keyword-families.js**: unchanged — the "A · Meal plan templates" family
  (template/printable patterns) stays because it tracks real search DEMAND;
  we just answer that demand with the system now.
- Build verified passing.

## Rules going forward

- When the weekly report suggests something off-positioning, fix the SOURCE
  (SEO-STRATEGY.md + llm.js prompt), not just the report — the LLM follows
  the strategy doc literally.
- GA4 `trackingOk: false` in this report does NOT necessarily mean broken
  tracking: the threshold is avg ≥20 sessions/weekday (insights.js) and the
  site has ~0 traffic. GTM container `GTM-NNX8XQRN` + GA4 `G-29ZYDDKHCN` were
  set up 2026-10-15; `NEXT_PUBLIC_GTM_ID` is in .env.local — needs verifying
  in the Vercel env + GA4 Realtime. Low-traffic sites will always trip the
  "tracking may be broken" insight.
- Pillar attribution plan: `blog_posts.pillar` (A–E, nullable; legacy posts
  stay NULL) via a new migration + admin editor dropdown, then include pillar
  in the report's blog digest (lib/reporting/blog.js).

## Files created/modified

- `SEO-STRATEGY.md` (Pillar A angle, Pillar D rewrite, rule 9, §5 rules)
- `lib/reporting/llm.js` (fallback, system prompt context, ban, format line)
- `SYSTEM.md` (pillar D description)
- `knowledge/sessions/2026-10-16-pillar-d-system-not-static.md` (this file)
- `knowledge/INDEX.md` (index entry)
