# 2026-10-16 — Pillar attribution + scheduled publishing + 4 pillar posts drafted & scheduled

## What was built

1. **Migration `064_blog_posts_pillar.sql`** — `blog_posts.pillar` (text, CHECK A–E,
   nullable; legacy wellness posts stay NULL) + idempotent backfill UPDATEs for the
   4 new posts by slug. ⚠️ Must be applied manually in the Supabase SQL Editor —
   Management API token (`Supabase_token` in .env.local) is STILL invalid (401,
   re-verified). Until applied: `lib/reporting/blog.js` degrades gracefully
   (retries select without pillar); the blog editor save with pillar errors —
   so run 064 at deploy time.
2. **Editor (BlogEditorClient)** — SEO Pillar dropdown (A–E + "no pillar/legacy")
   and a publish-date `datetime-local` field (visible when status=published;
   future date = scheduled, empty = now).
3. **Scheduled publishing** — the blog never filtered on `published_at`, so any
   published post showed immediately. All public surfaces now filter
   `published_at <= now()`: `/blog` list, `/blog/[slug]` (getPost + getRelated),
   `sitemap.js`, landing `LandingClient`. Verified via anon-key REST: 8 legacy
   posts visible, 4 scheduled hidden until their dates.
4. **Weekly report (`lib/reporting/blog.js` + llm.js digest)** — selects
   `pillar` (graceful fallback pre-064), counts only LIVE posts in
   `publishedThisWeek` (future-dated excluded), returns `scheduledUpcoming`
   so the Friday report sees the pipeline.
5. **4 pillar posts drafted + scheduled** (status=published, future
   published_at, Mondays 09:00 UTC, author = Claus e94a11d0):
   - A `weekly-dinner-themes` → 2026-10-19
   - B `50-dollar-weekly-meal-plan-family-aldi` → 2026-10-26
   - C `build-your-own-dinner-ideas` → 2026-11-02
   - D `meal-plan-generator-family` → 2026-11-09
   Each: direct answer in first 2 sentences, H2 structure, table/checklist,
   backward-only internal links (no links to not-yet-live posts), product CTA,
   HTML comments marking where Claus must add REAL photos / verify prices.
   Post B shopping list sums to exactly $48.71 (17 items).

## Gotchas / rules learned

- **Blog scheduling never existed** — `published_at` was display-only. Any
  published post went live instantly. Now future-dated = scheduled everywhere
  public (RLS still allows anon SELECT of is_published rows; visibility is
  enforced by the query filters, not RLS).
- **Founder byline:** profiles.full_name = "Claus" (ronald@outline.ee) —
  author_id e94a11d0-0819-47e7-983d-20dd7fd9da91. SEO-STRATEGY byline:
  "Claus — Precision Nutrition L1 certified coach, founder of MintyFit".
  blog_posts has NO author_name column (page falls back to 'MintyFit Team').
- **Legacy calculator embeds DO exist**: static files in `public/calculators/`
  (water/D3/magnesium) + `components/calculators/` React registry embedded via
  `<!-- CALCULATOR:slug -->` markers in BlogContent. `/calculators/` is NOT an
  app route — llm.js prompt now says this correctly.
- **Week 2 menu page NOT built**: the plan's "publish $50 plan as a /menus/
  page too" needs real recipes + verified prices (content rule 1 = first-hand).
  Remaining manual task: after Claus verifies prices/photos, build the menu in
  the product and link it from post B before 2026-10-26.
- SafeHtml strips HTML comments (DOMPurify) — `<!-- FOUNDER: ... -->` notes in
  post content are invisible on render. FORBID list: script/object/embed/form/
  input/button.
- `next build` passes after all edits.

## Update (same session) — admin preview + blog management moved to /admin

- **Admin preview of scheduled posts**: `/blog/[slug]` getPost now takes
  `includeScheduled` — super-admins bypass the `published_at <= now()` filter
  (anon still 404s scheduled posts). Admin sees an amber "Scheduled — goes
  live {date}" banner at the top of the preview. `generateMetadata` uses the
  same bypass.
- **Blog management moved into the admin area** (was `/blog/new` +
  `/blog/[slug]/edit` hanging off the public blog):
  - `/admin/blog` — full post list (all statuses): title, pillar badge,
    status badge (Draft / Scheduled·date / Live), published + updated dates,
    Edit / Preview actions, "+ New post" button. `force-dynamic`, admin client.
  - `/admin/blog/new` + `/admin/blog/[slug]/edit` — reuse `BlogEditorClient`;
    admin layout already gates super_admin.
  - AdminTabs gains "Blog" (before SEO Reports).
  - Legacy `/blog/new` + `/blog/[slug]/edit` = thin redirect pages into
    `/admin/blog/*` (bookmarks/links keep working).
  - BlogEditorClient router.push targets + a "← All posts" link now point to
    `/admin/blog`; BlogPostHeader edit button → `/admin/blog/[slug]/edit`.
  - RLS: super_admin insert/update/delete policies on blog_posts already
    existed (migration 028) — browser-client writes from the editor are fine.
- Build passes; routes `/admin/blog`, `/admin/blog/new`,
  `/admin/blog/[slug]/edit` all present.

## Update (same session) — /admin renamed to /mintadmn

- `git mv app/admin app/mintadmn` + every `/admin` URL reference updated:
  middleware PROTECTED_PATHS, robots.js disallow, Navbar (2), AdminTabs,
  blog redirects, BlogEditorClient, BlogPostHeader, notify.js, and all
  revalidatePath/Link strings inside the admin tree.
- Deliberately NOT renamed: `@/lib/admin/*` (module namespace), `/api/admin/
  import-plan/*` (API route, requireAdmin-gated), Supabase Auth `/admin/users`.
- robots.js keeps the disallow on the NEW path (path is not a true secret —
  it's in admin users' HTML; protection = role check, not obscurity).

### CRITICAL GOTCHA — never regex-rewrite files via PowerShell

The first replacement attempt used a PS 5.1 loop (`Get-Content -Raw` +
`[IO.File]::WriteAllText`) and caused two kinds of damage:
1. **Mojibake**: files rewritten with wrong encoding turned `—` into `ā€"`.
2. **Content swaps**: when `Get-Content` errored (5 times), `$raw` kept the
   PREVIOUS file's content, which then got written into the current file —
   e.g. customers/[id] content landed inside families/[id]/page.jsx.
Recovery: `git checkout -- app/mintadmn/` (index had clean post-mv state),
repaired one untracked file by rewriting it, redid the replacement with a
Node script (UTF-8-safe). Verified with `git diff` — only URL lines changed.
**Rule: use Node (or the Edit tool) for multi-file rewrites, never PowerShell
file writes; always verify with git diff afterwards.**

## Update 3 (same session) — full rewrite: keto positioning + human-readable style

User feedback on the 4 drafts: (1) full of AI building blocks — long dashes,
colons everywhere; (2) wants short paragraphs + styled subheadings; (3)
**MintyFit is a KETO FRIENDLY system** — pasta/pizza/bread/rice/potato/tortilla
content is off-positioning. My original drafts had pasta night, tortillas,
baked potato bars and a rice/bread-based $50 plan. All wrong.

- **All 4 posts rewritten in DB** (same slugs/schedule): zero em/en dashes,
  short 1–3-sentence paragraphs, h2 with green left-border vs plain h3
  (`.mf-h2`/`.mf-h3`/`.mf-table` classes + one `<style>` block per post —
  SafeHtml allows style tags + class attrs), FAQ sections per post.
  Keto rebuilds: themes now crustless quiche/lettuce-cup tacos/sheet-pan/
  keto pizza (fathead, chicken crust)/soups/roast; $50 Aldi plan rebuilt on
  eggs/whole chicken/ground beef/sausage/cheese/frozen broccoli+cauli rice/
  cabbage — 14 items = $49.80; build-your-own formats → lettuce-cup taco bar,
  burger bowls, loaded cauliflower bar, cauli-rice bowls, snack board, pizza
  bowls, salad/lettuce-wrap bar.
- **Source fix**: SEO-STRATEGY.md new **rule 10 (Keto-friendly system)** +
  Pillar C angle now names keto formats; llm.js fallback + system prompt got
  a KETO FRIENDLY PRODUCT clause. Rule for future posts added to style
  expectations: no em-dashes, short paragraphs, styled subheadings.
- Word counts ~1,090–1,230 per post (strategy target 1,200–2,000 with a
  "no padding" clause — close enough with FAQ substance).
- Build passes after llm.js edit.

**Standing content rules (confirmed by user):** keto only, no AI-isms
(em-dashes, colon-chains), short paragraphs, distinct subheading styling,
real founder voice.

## Update 4 (same session) — spacing, more subheadings, Ideogram images

- **Paragraph spacing**: content now wrapped in `<div class="mf-post">` and the
  per-post `<style>` block (v2) scopes spacing rules to it (`.mf-post p/ul/li`)
  — a bare `p {}` selector would leak page-wide. Also added `.mf-fig` figure
  styles. Classes + style tags survive SafeHtml (verified).
- **More subheadings**: every post now has 8–10 h2 + 3–10 h3.
- **Images generated with Ideogram v3** (project pattern: `model V_3`,
  `aspect_ratio 16x9`, `style_type REALISTIC`, negative prompt): 6 images,
  uploaded to `blog-images` bucket `blog/<name>.jpg` via Storage REST
  (x-upsert), then resized with sharp to 1280×720 q80 (1.3–2 MB → 102–197 KB).
  Heroes set as `image_url` on all 4 posts; inline figures in A (tacos) and
  C (snack board); PHOTO comments removed there (founder may still swap in
  real photos — better E-E-A-T). D keeps SCREENSHOT comments (real product
  shots needed, AI can't do those).
- **Gotcha**: first B hero had garbled AI packaging text ("BROLIEOLI") —
  `negative_prompt: text` is NOT enough when the scene contains packaging.
  Fix: prompt "plain unmarked packaging, no text/labels/logos" + negative
  prompt with "letters, words, labels, logos, brands, packaging print", then
  regenerate. Always visually inspect generated images before shipping.

## Update 5 (same session) — CRITICAL: post styling was silently broken; fixed at the platform level

User screenshot showed all subheadings rendering as plain body text. Root
cause, two layers:
1. **Tailwind preflight resets h1–h6 to inherit size/weight** — unstyled
   headings look exactly like body text in this app.
2. **Per-post `<style>` blocks don't survive/apply through SafeHtml
   (DOMPurify)** — the `.mf-h2/.mf-h3` class approach was dead on arrival.

Fix (the right architecture, benefits ALL posts incl. legacy):
- `components/blog/BlogContent.jsx` now sets `className="blog-article"` on
  the SafeHtml wrapper.
- `app/globals.css` gains `.blog-article` typography: h2 (emerald + green
  left border, `#34d399` in dark), h3/h4, p/ul/li spacing, themed tables,
  figure/figcaption, links, blockquote. Verified present in compiled CSS.
- The 4 scheduled posts' dead `<style>` blocks stripped (semantic h2/h3 +
  classes remain, harmless).

**Rule: never put styling in post content (`<style>` or per-post CSS).
Author content stays semantic; article typography lives in
`.blog-article` in globals.css.** When a rendered page looks like
"plain text", check for a CSS reset (preflight) BEFORE blaming content.

## Update 6 (same session) — the 7 theme-night recipes created for blog post A

Created all 7 dinners from the "7 Weekly Dinner Themes" post as PUBLIC recipes
(owner = Claus), via a server-side replica of the platform pipeline (the app's
own `generateRecipe` is client-bound: relative /api/grok + browser supabase):
- Hand-written step JSON in the exact platform shape (5 steps each, 40–80-word
  instructions, time_markers, components, metric ingredient amounts) — matched
  to what the blog promises.
- **Nutrition**: direct Anthropic call replicating `getNutritionData` EXACTLY
  (same Haiku model `claude-haiku-4-5-20251001`, same system prompt, same
  52-nutrient JSON shape). 462–962 kcal/serving (plausible for keto);
  `calorie_range` derived from the estimate.
- **Images**: Ideogram v3 (same prompt pattern as regenerate-image route) →
  sharp 640×360 detail + 320×180 thumb → `recipe-images/<uuid>-{detail,thumb}.jpg`.
- Meta: `meal_type dinner`, `food_type keto`, `glycemic_load low`,
  `price_level budget`, allergens from the MyAccount vocabulary
  (gluten/dairy/nuts/shellfish/soy/eggs/fish/peanuts). `is_public: true` →
  they appear in /recipes, sitemap, and open for blog readers.
- Blog post A week table now links each dish to `/recipes/<slug>` + a line
  pointing at the recipe library.

Recipe URLs: /recipes/crustless-quiche-with-green-salad,
/recipes/beef-tacos-in-lettuce-cups, /recipes/sheet-pan-sausage-broccoli-zucchini,
/recipes/veggie-omelets-with-berries, /recipes/fathead-pizza,
/recipes/broccoli-cheddar-soup, /recipes/roast-chicken-brussels-sprouts-cauliflower

**Reusable**: this server-side recipe-creation script pattern (Haiku nutrition
+ Ideogram + sharp + insert) works for any future bulk recipe seeding.

## Update 7 (same session) — theme week became a MENU (not a new "recipe group" asset)

User asked: menu or new "recipe group" asset? **Decision: Menu.** Rationale:
the 7 recipes have day semantics, and `/api/menus/apply` already distributes
menu_recipes day-by-day via `meal_type` + `sort_order` (index within the
meal_type group = day offset from start_date). A recipe-group asset would
duplicate menu_recipes + need new public pages/planner integration — against
Simplicity First. Menus are also the SEO Pillar B/E engine (/menus/ pages).

- Created public menu **"7 Theme-Night Dinners: The Keto Family Week"** at
  `/menus/weekly-dinner-themes` (owner Claus): 7 menu_recipes rows,
  meal_type 'dinner', sort_order 0–6 (Monday→Sunday matching the blog table).
- Image: reused blog hero, resized 640×360 + 320×180 into recipe-images as
  `menu-<uuid>-{detail,thumb}.jpg`.
- menus table columns: id, profile_id, name, description, slug (unique),
  is_public, image_url, image_thumb_url. menu_recipes: menu_id, recipe_id,
  meal_type, sort_order.
- Blog post A CTA now links the menu directly ("publish it to your calendar
  in one click").

**Pattern established for all future week-plan posts: blog week plan ⇄ public
menu with sort_order = day index.** Week 2 ($50 Aldi) gets the same treatment
once prices are verified.

## Update 8 (same session) — GLOBAL product rule: no single-store content (post B rewritten)

User: "With Aldi you mean a groceries store? We have a global app. We can't
have one store specific items or prices. This pricing is useless like this."
Correct — single-store pricing is useless globally. Fixed at all layers:

- **Post B fully rewritten + RE-SLUGGED**: `50-dollar-weekly-meal-plan-family-aldi`
  → `50-dollar-weekly-meal-plan-family-of-4`. Title now "(Keto, Any Store)".
  Exact Aldi prices → **target prices** ("≤ $7 — beat this and the week is
  under budget") with metric+imperial amounts; notes the same basket is
  ~€45–50 at Lidl/Tesco/Carrefour; FAQ "Does this work outside the US?"
  Hero image kept (already unbranded after the regen).
- **Inbound links fixed** in posts C and D (URL + "$50 Aldi week" anchor text).
- **Migration 064** backfill slug updated (not yet applied by user).
- **SEO-STRATEGY.md Pillar B**: targets drop `aldi meal plan`/`walmart meal
  plan`; angle = "budget week plans that work at any store, in any country —
  real quantities with TARGET prices, never one store's receipt".
- **llm.js**: new GLOBAL PRODUCT rule (never single-store lists/prices;
  budget = target prices at any discount grocer, any currency) in both the
  system prompt and the fallback.
- Verified: 0 Aldi mentions, 0 old-slug links, 0 dashes across all 4 posts;
  build passes (hit the known `spawn UNKNOWN` Windows commit-charge issue
  once when running node + build in parallel — kill stray node processes,
  run sequentially).

**Standing rule added: MintyFit is GLOBAL. Content never depends on one
store, one country's products, or one currency. Prices = targets, quantities
= metric + imperial.**

## Files created/modified

- `supabase/migrations/064_blog_posts_pillar.sql` (new)
- `components/blog/BlogEditorClient.jsx` (pillar dropdown + publish-date field)
- `app/blog/page.jsx`, `app/blog/[slug]/page.jsx`, `app/sitemap.js`,
  `components/landing/LandingClient.jsx` (published_at <= now filters)
- `lib/reporting/blog.js` (pillar select + fallback, live-only counting,
  scheduledUpcoming), `lib/reporting/llm.js` (digest fields)
- `app/mintadmn/blog/page.jsx`, `app/mintadmn/blog/new/page.jsx`,
  `app/mintadmn/blog/[slug]/edit/page.jsx` (new admin blog management —
  whole `app/admin` tree renamed to `app/mintadmn` in this session)
- `app/blog/new/page.jsx`, `app/blog/[slug]/edit/page.jsx` (redirects to admin)
- `components/admin/AdminTabs.jsx` (Blog tab), `components/blog/BlogPostHeader.jsx`,
  `components/blog/BlogEditorClient.jsx` (admin paths)
- `SYSTEM.md` (blog_posts schema entry + routes table)
- 4 rows in `blog_posts` (scheduled)
