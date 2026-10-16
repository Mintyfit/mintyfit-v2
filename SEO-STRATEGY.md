# SEO-STRATEGY.md — MintyFit Organic Growth Playbook

> **This file is the single source of truth for MintyFit SEO.** The weekly SEO
> report (`lib/reporting/`) reads it and frames every finding, priority, and
> content suggestion against it. When the strategy changes, change it HERE.

---

## 1. Positioning — what we are trying to win

MintyFit is **the only nutrition platform built for families, not individuals**.
Organic search must reinforce that position. We do not compete for generic
recipe or calorie-tracker queries — we compete for the **practical family
feeding problem**: planning the week, feeding picky eaters, shopping once,
spending less, one meal for everyone.

**Strategic rule:** lifestyle content, not medical content. "What should my
family eat this week" is our territory. "How much iron does a toddler need"
(medical/YMYL) is not — those queries belong to Mayo/CDC/AAP and require
credentialed review we don't have. We drop medical claims, not the family
topic.

## 2. Out of scope — do not pursue

- **Kids' nutrient RDA queries** ("how much iron does a toddler need",
  "vitamins children need by age") — YMYL, owned by .gov/medical authorities.
- **Supplement/wellness content** (vitamin D3, magnesium, FODMAPs, bloating) —
  the existing legacy blog posts live here; keep them, invest nothing new.
- **Teen athlete nutrition** — YMYL-adjacent.
- **Head terms** ("recipes", "meal planning", "healthy eating") — multi-year
  domain-authority gap; revisit in year 2.
- **Single-person diet content** — off-positioning.

## 3. The five keyword pillars

Every piece of content belongs to exactly one pillar. The weekly report tracks
each pillar as a keyword family and measures coverage, movement, and gaps.

### Pillar A — Meal planning systems (topical home base)
Targets: `theme night dinner ideas`, `weekly dinner themes`,
`weekly meal plan template printable`, `how to meal plan for a family`,
`meal planning for busy working parents`, `family dinner rotation`,
`cook once eat twice`, `leftover makeover meals`.
Angle: systems that kill the 5pm "what's for dinner" decision. Differentiate
with **different appetites, one meal** — nobody covers per-person sizing.
Template/printable demand in this pillar is answered with the live planner
(rule 9), never a downloadable file.
SERP evidence: small mom-blogs dominate (familyfoodonthetable.com,
sunnydayfamily.com). Winnable now.

### Pillar B — Budget family meals (strongest product tie-in)
Targets: `family meal plan on a budget`, `$50 weekly meal plan`,
`$100 grocery list family`, `grocery budget for family of 4`,
`cheap keto meals for a family`, `how to waste less food`.
Angle: **budget week plans that work at any store, in any country** — real
quantities with TARGET prices ("beat this and the week is under budget"),
never one store's receipt. MintyFit is a global product: single-store
content (Aldi/Walmart/Lidl-specific items or prices) is useless to most of
the world and is NEVER published. Keto budget staples per rule 10 (eggs,
whole chicken, ground meat, cabbage, frozen broccoli), publishable at scale
from our own menu engine (`/menus/` pages + blog).
SERP evidence: thetexmexmom.com (#1), thesavvybite.com — small blogs win.

### Pillar C — Picky eaters (practical only)
Targets: `weekly meal plan for picky eaters`, `picky eater meal plan with
grocery list`, `deconstructed dinners`, `build your own dinner ideas`,
`one meal for the whole family`, `no short order cooking`.
Angle: build-your-own/deconstructed formats (lettuce-cup taco bar, burger
bowls, loaded cauliflower, snack board) — one meal, everyone assembles, all
keto-friendly per rule 10. One neutral "safe food" sentence max;
NO nutrient/medical claims (link out to AAP instead).
SERP evidence: childrensrecipes.com, PickyPlanIt, Netmums — small sites win.
Recipe-roundup queries ("dinner ideas picky eaters") are medium difficulty
(Taste of Home, BBC present) — supporting content only.

### Pillar D — The system, shown working (tools & generator queries)
Targets: `meal plan generator`, `grocery list generator`,
`weekly meal planner template`, `meal planner online`,
`recipe serving size calculator`, `family calorie calculator`.
Angle: searchers asking for a template, printable or generator want the JOB
done, not a file. MintyFit IS the tool — every Pillar D page demonstrates
the live system doing that job: the `/plan` weekly planner with per-person
portions, auto-generated grocery lists, ready-made week plans under
`/menus/`. The supporting article wraps the demonstration (screenshots, a
real family's week), never a download. We NEVER ship static artifacts (rule
9) — a "template" query is answered by showing the system doing what a
template only describes. Future free interactive pages (e.g. a family
portions/calorie calculator) reuse the production BMR/RDA engine
(formulas, not advice) and hang off this pillar's hub post.
SERP evidence: Swoodie, Burnplate, FamilyMacro — small tools rank.

### Pillar E — Commercial (product pages)
Targets: `family meal planning app`, `meal planning app for families`,
`shared grocery list app`, `family meal plan with grocery list`,
`meal plan for family of 4 / 5` (programmatic `/menus/` pages).
SERP evidence: Mealisto, Foodoodle, Fam to Table — all tiny indie apps.
Relevance beats domain authority here.

## 4. Content rules — every blog post must

1. **First-hand experience first.** Write as the parent-founder: "what my
   family actually ate this week", real photos, real prices, real failures.
   Google's lifestyle SERPs reward lived Experience over polished editorial
   (a "real-parent meals" community post outranks NYT Cooking).
2. **Author byline:** founder name + "Precision Nutrition L1 certified coach,
   founder of MintyFit". No medical review claims, ever.
3. **One target query per post** (+ its close variants in subheads). Clean
   descriptive slug — `/blog/weekly-meal-plan-picky-eaters`, never IDs.
4. **Structure for snippets:** direct answer in the first 2 sentences,
   scannable H2 sections, at least one table or checklist where useful.
5. **Every post ends with the true CTA:** "MintyFit does this automatically —
   one plan, per-person portions, shared grocery list." Link to the relevant
   tool/menu page, never a generic signup link.
6. **Internal linking:** every post links up to its pillar hub and sideways to
   2–3 sibling posts. New /menus/ pages get linked from their blog siblings.
7. **Length:** as long as the SERP winners' substance requires — typically
   1,200–2,000 words. No padding.
8. **Cadence:** 1 post per week minimum, alternating pillars A→B→C→D until
   each pillar has 4+ posts, then follow the data (double down on pillars
   showing impressions growth in the weekly report).
9. **No static artifacts, ever.** We do not publish printable PDFs,
   downloadable or fillable templates, spreadsheets, or email-gated files.
   The live system replaced them: when a target query implies a file
   ("template", "printable", "worksheet"), the post demonstrates MintyFit
   doing that job interactively (theme rotation in /plan, a priced week
   under /menus/, the generated grocery list) and CTAs into the product.
10. **Keto-friendly system.** MintyFit is keto friendly, and the blog eats
    the way the product plans. Never build meal ideas around high-carb
    staples (regular pasta, pizza dough, bread, rice, potatoes, tortillas,
    sugar, beans-as-centerpiece). Use the keto formats instead: lettuce-cup
    tacos, cauliflower rice, zucchini noodles, fathead or crustless pizza,
    roasted low-carb vegetables, eggs, cheese, whole cuts of meat. Budget
    content (Pillar B) must respect this too — cheap keto staples (eggs,
    whole chicken, ground meat, cabbage, frozen broccoli), not pasta/rice.

## 5. What the weekly report must do

The automated weekly report (Vercel cron, Fridays) exists to answer three
questions: **Are we growing? What moved? What do we publish next?**

Rules for its analysis:

- **Facts come from data only** (GSC + GA4 + blog DB). Every number in the
  narrative must exist in the input data — derived or invented figures are
  rejected by the number audit.
- **Track the five pillars as keyword families** (see
  `lib/reporting/keyword-families.js`): impressions, clicks,
  impression-weighted position, week-over-week delta, carrier page.
- **Flag pillar gaps:** any pillar with impressions but position >20 = content
  gap → suggest specific content. Any pillar with ~zero impressions after its
  first 4 posts = indexing/quality problem, not a "wait longer" problem.
- **Striking distance first:** keywords at position 4–15 with ≥30 weekly
  impressions are the fastest wins — recommend refreshing/expanding the
  carrier page before suggesting anything new.
- **New queries = editorial input:** GSC queries that appeared this week and
  fit a pillar are blog-post candidates; queries that fit no pillar are
  signals to re-read §2 before writing anything.
- **Content suggestions must name the pillar**, the target query, the working
  title, and the carrier/competitor evidence from this week's data — never
  generic "write about meal planning" advice.
- **Suggestions develop the system, never static artifacts.** A suggestion
  must never be a printable PDF, a downloadable/fillable template, a
  spreadsheet, or any file (rule 9). Tool/template/generator queries (Pillar
  D) are answered by showcasing the live product — /plan, /menus/, generated
  grocery lists, per-person portions — or by proposing a new interactive page
  built on our engines.
- **Legacy posts have no pillar.** The pre-strategy wellness library
  (supplements, FODMAPs, bloating, stress, adult calculators) is out of scope
  per §2: never suggest refreshes, interlink campaigns, or pillar tags for
  it. Pillar attribution and hub links apply to new posts only.
- **Publishing cadence check:** if 0 posts were published in the last 14 days,
  the report says so plainly — consistency is the strategy.
- **SERP reality check:** all recommendations respect §2 (out of scope). The
  report must never suggest medical/YMYL content.

## 6. Methodology notes

- Weekly window: last 7 complete days (ending 2 days ago — GSC/GA4 lag) vs
  the 7 days before.
- Family position = impression-weighted average across matching queries.
- Under 10 weekly impressions = statistical noise, not a trend.
- ±2 positions = stable; only ±3 or more is reported as movement.
- Carrier page = the landing page with the most impressions for that family.
- Reports are stored in `seo_weekly_reports` (Supabase) so week-over-week
  trends survive beyond GSC's 16-month window.

## 7. Setup / env (one-time)

| Variable | Purpose |
|---|---|
| `GSC_SITE_URL` | Search Console property — use the **domain property**: `sc-domain:mintyfit.com` |
| `GA4_PROPERTY_ID` | numeric GA4 property for traffic data |
| `GCP_SERVICE_ACCOUNT_JSON` (prod) / `GOOGLE_APPLICATION_CREDENTIALS` (local) | service account with GA4 Viewer + GSC user access |
| `CRON_SECRET` | bearer token protecting `/api/cron/*` |
| `ANTHROPIC_API_KEY` | LLM narrative (already configured) |
| `RESEND_API_KEY` + `RESEND_FROM_REPORTS` | weekly email delivery — **own Resend account + verified sender address** (see below) |

**Sender address:** reports send from `RESEND_FROM_REPORTS`
(e.g. `MintyFit Reports <reports@mintyfit.com>`) — a sender verified in OUR
Resend account, not any third party's. Setup: create Resend account → verify
the mintyfit.com domain (DNS records) → add the API key as `RESEND_API_KEY`
and the sender as `RESEND_FROM_REPORTS` in Vercel env.

Recipients are managed in Admin → SEO Reports (stored in `admin_settings`,
key `seo_report_recipients`).
