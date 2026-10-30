# 2026-10-30 — Weekly SEO report: review + improvement pass

## What happened

Full review of the weekly SEO report system (`lib/reporting/`, cron route,
`/mintadmn/seo-reports`) followed by a 12-item improvement pass. All verified
with a unit harness (mock snapshots through `buildInsights`) AND a live
end-to-end cron run against prod data (`?send=0`, port 3001).

## Fixes shipped

**Correctness / false positives**
1. **GA4 "tracking may be broken" false positive eliminated.** Old rule fired
   whenever avg <20 sessions/weekday — i.e. EVERY week on a low-traffic site
   (this exact failure was predicted in 2026-10-16-pillar-d notes). New logic:
   GA4 sessions >0 = tracking works (stay silent); GSC clicks >0 + GA4 sessions
   =0 = negative "tracking IS broken" (the only reliable broken signal); both
   zero = mild warning advising a one-time GA4 Realtime check.
2. **Volume floors on WoW insights**: ±15% click/session insights now also
   require ≥5 clicks / ≥20 sessions absolute weekly delta. 0→1 clicks/day no
   longer reads "+100% growth".
3. **Pillar vs family unit bug**: gap/silent insights counted keyword FAMILIES
   but said "pillars" (pillar A has 3 families). Now counts distinct pillars.
4. **Silent pillars split by content existence** per SEO-STRATEGY.md §5:
   `blog.js` now returns `pillarCounts` (live posts per pillar); pillars with
   live posts + zero impressions = warning (indexing problem), pillars with no
   posts = opportunity (rotation hasn't reached them). Blog-data-missing falls
   back to the old generic warning.
5. **Cadence warning sees the schedule**: when `scheduledUpcoming` is non-empty
   the warning names the next go-live date and softens the action. blog.js now
   sorts `scheduledUpcoming` ASC (was DESC = furthest-future first — wrong
   "next" post).
6. **"Avg position 0"** shown when GSC had zero impressions (default 0 leaked
   into email + admin scorecards) — now "–" with "no impressions" sub.
7. **Plain-text email part was built but never sent** — `buildReportEmail`
   returned `text` but `sendEmail` didn't accept it. Added `text` param
   (backwards compatible; all 8 call sites use object args) + notify passes it.

**Found DURING live verification — number-audit sign bug (the big one)**
8. First live cron run fell back to rules-only: audit flagged "86, 11", retry
   "75". Root cause proved with a minimal repro: insight title says
   "Sessions declining (144 → 20, **-86%**)" but natural prose says "fell
   **86%**" — the audit compared signed values, so a figure quoted verbatim
   from an insight failed the audit. Fix: magnitude-only comparison in
   `matches()`. Re-ran the cron after the fix: `narrative: "llm"`, 4.8KB
   high-quality narrative. **This bug would have rejected narratives every
   time the report had a declining metric** (i.e. exactly the weeks the
   founder most needs the analysis).

**Also fixed from review**
9. Watch (YMYL) family could appear as "striking distance" / riser / faller /
   low-CTR opportunities — the report simultaneously said "do not chase" and
   "expand the carrier page". Watch family now excluded from all investment
   recommendations (tracked for awareness only via the dedicated watch insight).
10. New queries auto-tagged with their pillar (`familyForQuery` export) — the
    insight no longer asks the founder to do the mapping manually.
11. `SEVERITY_ORDER` deduped: exported from insights.js, generate.js imports.
12. Admin detail page surfaces previously-hidden stored data: scheduled-post
    pipeline (in Blog activity), GSC top queries (top 10), GA4 channels +
    top pages.

## Verification evidence

- Unit harness (`Temp/opencode/seo-insights-test/`): 5 mock scenarios pass —
  zero-traffic honesty, broken-tracking detection, WoW noise suppression,
  real-move detection, YMYL watch without the striking-distance contradiction.
- `npm run build` clean (lint + types).
- Live cron run (prod build, `?send=0`): ok, report id 7 (upserted), 4
  insights, GSC/GA4/blog all pulled (real data: sessions 144→20 = the
  post-GTM-setup test traffic falling off, pillarCounts {A:1,B:1} → correct
  2-invisible/3-uncovered split, post B detected live, C+D pipeline detected).
- Number audit repro: `fell 86%` vs insight `-86%` → violation BEFORE fix,
  clean AFTER. Second live run: `narrative: "llm"`.

## Rules going forward

- **The number audit compares magnitudes, not signs.** If a future audit
  rejection looks wrong, check sign phrasing and rounding before touching the
  whitelist — and repro locally with `auditNarrativeNumbers` on the real
  insight text (5-line script, see this session's temp files).
- When the narrative falls back to rules-only, the reason is in the function
  logs (`Narrative number audit flagged: ...`) — check before assuming an API
  outage.
- The insights engine's contract with the strategy doc: watch family = detect
  and warn, NEVER recommend investment; silent pillars split by
  `pillarCounts`; low traffic is not broken tracking.
- blog.js `scheduledUpcoming` is sorted next-to-go-live first — index [0] is
  always the next post.

## Files modified

- `lib/reporting/insights.js` (tracking rework, volume floors, pillar units,
  silent split, cadence pipeline, pillar tags, watch exclusion, SEVERITY_ORDER)
- `lib/reporting/blog.js` (pillarCounts, scheduled sorted ascending)
- `lib/reporting/keyword-families.js` (`familyForQuery` export)
- `lib/reporting/number-audit.js` (sign-insensitive magnitude match)
- `lib/reporting/generate.js` (SEVERITY_ORDER import)
- `lib/reporting/email-html.js` (position dash when no impressions)
- `lib/reporting/notify.js` (pass text part), `lib/email/sendEmail.js` (text param)
- `app/mintadmn/seo-reports/[id]/page.jsx` (scheduled pipeline, top queries,
  GA4 channels/pages, scorecard position fix, pillar badges on posts)
- `SYSTEM.md` (weekly-report section updated)
