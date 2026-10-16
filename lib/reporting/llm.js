/**
 * LLM narrative layer for the weekly SEO report (hybrid model): the rules
 * engine (insights.js) produces the facts; this module asks an LLM to
 * prioritize and phrase the narrative on top — including blog-content
 * suggestions that must follow SEO-STRATEGY.md.
 *
 * The strategy document is injected into the system prompt, so the analysis
 * literally follows the instructions file. Provider: Anthropic Messages API
 * (ANTHROPIC_API_KEY). With no key set the report ships rules-only (returns
 * null, never blocks the pipeline).
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { auditNarrativeNumbers } from './number-audit'

const TIMEOUT_MS = 90_000
const MAX_TOKENS = 2500

/** Embedded fallback if SEO-STRATEGY.md is not reachable at runtime. */
const STRATEGY_FALLBACK = `MintyFit SEO strategy (summary): lifestyle family-feeding content, not medical/YMYL.
Five pillars: A) meal planning systems (theme nights, rotations, how-to), B) budget family meals
(priced weekly plans with grocery lists), C) picky eaters (practical meal plans, deconstructed
dinners — no medical claims), D) the system shown working (generator/planner/template queries
answered by demonstrating the live product — never static files), E) commercial (family meal
planning app, /menus/ pages for family-of-N plans).
Out of scope: kids' nutrient RDA/medical queries, supplements, head terms. Cadence: 1 post/week,
alternating pillars. Striking-distance keywords (pos 4–15, ≥30 impressions) come before new content.
Never suggest static artifacts (printable PDFs, downloadable templates, spreadsheets): the live
system is the answer to template/generator queries. MintyFit is keto friendly: never suggest content
built on high-carb staples (regular pasta, pizza dough, bread, rice, potatoes, sugar) — use keto
formats (lettuce-cup tacos, cauliflower rice, zucchini noodles, fathead/crustless pizza, eggs, cheese).
Global product: budget content uses target prices at any discount grocer, never single-store pricing.`

let strategyCache = null
function loadStrategy() {
  if (strategyCache) return strategyCache
  try {
    strategyCache = readFileSync(path.join(process.cwd(), 'SEO-STRATEGY.md'), 'utf-8')
  } catch {
    strategyCache = STRATEGY_FALLBACK
  }
  return strategyCache
}

function buildSystemPrompt() {
  return `You are the SEO strategist for MintyFit (mintyfit.com) — a family nutrition and meal-planning platform. You write the weekly SEO report for the founder.

THE STRATEGY DOCUMENT (SEO-STRATEGY.md — the single source of truth; frame EVERY priority and content suggestion against it):
--- BEGIN SEO-STRATEGY.md ---
${loadStrategy()}
--- END SEO-STRATEGY.md ---

Additional context you know:
- The blog is database-driven; posts ship under /blog/<slug>; menus under /menus/<slug>.
- The live product surfaces that content points at: /plan (weekly planner with per-person portions), /menus/<slug> (ready-made week plans with generated grocery lists), /recipes/<slug>, /shopping-list, /statistics. There is no /calculators/ section.
- GSC position = impression-weighted average. Under 10 impressions/week = statistical noise, not a trend.
- Keyword families map to the strategy pillars; families may overlap. ±2 positions = stable.
- The existing legacy blog (vitamin D3, magnesium, FODMAPs, bloating, stress, water/D3 calculators) is off-strategy adult-wellness content and belongs to NO pillar — do not suggest more of it, and never propose refreshes, interlink campaigns, or pillar tags for it; investment goes to new pillar posts only.
- STATIC-ARTIFACT BAN: never suggest producing printable PDFs, downloadable or fillable templates, spreadsheets, worksheets, or any file-based giveaway. MintyFit IS the interactive replacement — suggestions for tool/template/generator queries (Pillar D) must present the live system doing the job (theme rotation in /plan, priced week plans under /menus, generated grocery lists) and link into the product, or propose a new interactive page built on our nutrition engine.
- KETO FRIENDLY PRODUCT: never suggest content built around high-carb staples (regular pasta, pizza dough, bread, rice, potatoes, tortillas, sugar). Meal ideas in suggestions use keto formats — lettuce-cup tacos, cauliflower rice, zucchini noodles, fathead or crustless pizza, roasted low-carb vegetables, eggs, cheese, whole cuts of meat. This applies to budget content too.
- GLOBAL PRODUCT: never suggest content tied to one store or one country's prices (no Aldi/Walmart/Lidl-specific lists or receipts). Budget content uses real quantities with TARGET prices that work at any discount grocer, in any currency.

WRITE in English, directly, with numbers. Audience: the founder, who decides what to publish next week.

NUMBER RULE (strict — a violation discards the entire text): use ONLY numbers that appear in the input JSON or the insights texts. Do not compute your own percentages, sums, averages or deltas; do not add or subtract numbers; do not re-round them. If a number you want is missing from the input, describe the direction in words (rose/fell) without a figure. If there is nothing to say, omit it. Content suggestions must be grounded in the input queries/families and the strategy document — never invent queries or topics not present in the data or the strategy.

EMPTY-DATA CLAUSE: when GSC/GA4 show zero or near-zero values (a site with no organic visibility yet), say that plainly and make the report about what to publish first and how setup/tracking improves from here. NEVER invent baselines, industry averages, benchmark CTRs, typical volumes, timelines with numbers, or projected figures — those are invented numbers and fail the audit.

OUTPUT FORMAT (GitHub-flavored markdown, exactly these four headings, in this order):
## Summary
1 paragraph: better or worse than last week + the single number that best proves it.
## Notable movements
3–6 bullets, each: what moved + why it matters.
## Next week priorities
Numbered list (max 6), each: one concrete action + expected effect. Separate content, on-page, and technical work.
## Content suggestions
2–4 concrete blog-post suggestions. For each: the pillar (A–E), the target query, a working title, and the data or strategy section that justifies it. Prefer striking-distance refreshes of existing pages when the data shows them. Pillar D suggestions introduce the live system (or a new interactive page on our engine) — never a static download.`
}

const r1 = (n) => Math.round(n * 10) / 10

function buildDigest(snapshot, insights) {
  const d = {
    period: snapshot.period,
    insights: insights.map((i) => ({ area: i.area, severity: i.severity, title: i.title, action: i.action })),
    errors: snapshot.errors,
  }

  if (snapshot.gsc) {
    const g = snapshot.gsc
    d.gsc = {
      clicksPerDay: r1(g.current.clicks / g.current.days),
      prevClicksPerDay: r1(g.previous.clicks / g.previous.days),
      impressionsPerDay: r1(g.current.impressions / g.current.days),
      prevImpressionsPerDay: r1(g.previous.impressions / g.previous.days),
      ctr: g.current.ctr,
      position: r1(g.current.position),
      families: g.families
        .filter((f) => f.current.impressions > 0 || f.previous.impressions > 0)
        .map((f) => ({
          label: f.label,
          pillar: f.pillar,
          pos: f.current.position === null ? null : r1(f.current.position),
          prevPos: f.previous.position === null ? null : r1(f.previous.position),
          impressions: f.current.impressions,
          clicks: f.current.clicks,
          carrier: f.carrier?.page,
        })),
      newQueries: g.newQueries.slice(0, 12).map((q) => ({ query: q.query, impressions: q.impressions, position: r1(q.position), page: q.page })),
      topQueries: g.topQueries.slice(0, 15).map((q) => ({ query: q.query, clicks: q.clicks, impressions: q.impressions, position: r1(q.position) })),
    }
  }

  if (snapshot.ga4) {
    const g = snapshot.ga4
    const isWeekday = (yyyymmdd) => {
      const d2 = new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T00:00:00Z`).getUTCDay()
      return d2 >= 1 && d2 <= 5
    }
    const weekdays = g.daily.filter((x) => isWeekday(x.date))
    const base = weekdays.length > 0 ? weekdays : g.daily
    const avgDaily = base.length > 0 ? base.reduce((s, x) => s + x.sessions, 0) / base.length : 0
    d.ga4 = {
      sessions: g.current.sessions,
      prevSessions: g.previous.sessions,
      engagementRate: g.current.engagementRate,
      trackingOk: avgDaily >= 20,
      channels: g.channels.slice(0, 8).map((c) => ({ channel: c.channel, sessions: c.sessions })),
    }
  }

  if (snapshot.blog) {
    d.blog = {
      publishedThisWeek: snapshot.blog.publishedThisWeek.map((p) => ({ title: p.title, slug: p.slug, pillar: p.pillar })),
      publishedThisWeekCount: snapshot.blog.publishedThisWeek.length,
      scheduledUpcoming: (snapshot.blog.scheduledUpcoming ?? []).map((p) => ({ title: p.title, slug: p.slug, pillar: p.pillar, goesLive: p.publishedAt })),
      prevWeekCount: snapshot.blog.prevWeekCount,
      totalPublished: snapshot.blog.totalPublished,
      daysSinceLastPost: snapshot.blog.daysSinceLastPost,
    }
  }

  return d
}

/**
 * Generate the narrative for a report. Returns null when no LLM key is set
 * or the API call fails (never blocks the report). One corrective retry is
 * allowed when the number audit rejects the first draft.
 */
export async function generateNarrative(snapshot, insights) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const digest = buildDigest(snapshot, insights)
  const userContent =
    'Here are last week\'s data (JSON) and the rules engine\'s findings. ' +
    'Write the analytical part of the weekly SEO report from them.\n\n' +
    JSON.stringify(digest, null, 1)

  const first = await callAnthropic(apiKey, userContent)
  const violations = first ? numberViolations(first, digest, insights) : []
  if (first && violations.length === 0) return first
  if (!first) return null

  /* Corrective retry: tell the model exactly which numbers it invented. */
  console.warn(`Narrative number audit flagged: ${violations.join(', ')} — retrying with correction.`)
  const retryContent =
    userContent +
    `\n\nYour previous draft contained these numbers that do NOT appear in the input data, the insights, or the strategy document: ${violations.join(', ')}. ` +
    'Rewrite the full report WITHOUT them: use only numbers that appear verbatim in the input.'
  const second = await callAnthropic(apiKey, retryContent)
  return finalize(second, digest, insights)
}

/** Violation list from the number audit (empty = passed). */
function numberViolations(text, digest, insights) {
  return auditNarrativeNumbers(text, [JSON.stringify(digest), JSON.stringify(insights), loadStrategy()])
}

/**
 * Gate the LLM output through the number audit: any number not present in
 * the real inputs means the model invented or derived a figure — discard the
 * narrative, ship rules-only.
 */
function finalize(text, digest, insights) {
  if (!text) return null
  // Allowed number sources: the data digest, the rules-engine insights, and
  // the strategy document itself (the narrative may cite strategy figures
  // like "$50 weekly meal plan" — inventing NEW numbers is what we reject).
  const violations = numberViolations(text, digest, insights)
  if (violations.length > 0) {
    console.error(`Narrative number audit failed — invented/derived numbers: ${violations.join(', ')}. Falling back to rules-only.`)
    return null
  }
  return text
}

async function callAnthropic(apiKey, userContent) {
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: userContent }],
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`)
      return null
    }
    const data = await res.json()
    const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim()
    return text || null
  } catch (error) {
    console.error('Anthropic narrative failed:', error instanceof Error ? error.message : error)
    return null
  } finally {
    clearTimeout(timer)
  }
}
