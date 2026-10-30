/**
 * The tracked keyword families — one per SEO pillar from SEO-STRATEGY.md §3,
 * plus brand and a watchlist family. Matching is case-insensitive regex on
 * the GSC query string; families may overlap on purpose (a parent family
 * includes its variants).
 *
 * Position per family = impression-weighted average across matching queries
 * (SEO-STRATEGY.md §6).
 */

export const KEYWORD_FAMILIES = [
  // Pillar A — Meal planning systems
  {
    id: 'pillar-a-meal-plan-systems',
    label: 'A · Meal planning systems',
    pillar: 'A',
    pattern: /meal\s*plan|meal\s*prep.*(family|week)|weekly\s*menu|dinner\s*rotation/i,
  },
  {
    id: 'pillar-a-theme-nights',
    label: 'A · Theme night dinners',
    pillar: 'A',
    pattern: /theme\s*night|dinner\s*theme|taco\s*tuesday|meatless\s*monday|pizza\s*(night|friday)|fish\s*friday/i,
  },
  {
    id: 'pillar-a-templates',
    label: 'A · Meal plan templates',
    pillar: 'A',
    pattern: /meal\s*plan.*(template|printable)|template.*meal\s*plan|meal\s*planner\s*(template|printable)|printable.*meal/i,
  },
  // Pillar B — Budget family meals
  {
    id: 'pillar-b-budget',
    label: 'B · Budget family meals',
    pillar: 'B',
    pattern: /budget.*(meal|dinner|grocer|food)|cheap\s+(meal|dinner|family)|\$\s?\d+.*(meal|grocer)|(meal|grocer).*\$\s?\d+|grocery\s*budget|aldi|walmart.*meal|food\s*waste/i,
  },
  // Pillar C — Picky eaters (practical)
  {
    id: 'pillar-c-picky',
    label: 'C · Picky eaters',
    pillar: 'C',
    pattern: /picky\s*eat|fussy\s*eat|selective\s*eat|kid(s)?.*(won'?t\s*eat|refuse)|safe\s*food/i,
  },
  {
    id: 'pillar-c-deconstructed',
    label: 'C · Deconstructed / build-your-own',
    pillar: 'C',
    pattern: /deconstruct|build[- ]?your[- ]?own|taco\s*bar|pasta\s*bar|baked\s*potato\s*bar|snack\s*(board|plate|dinner)|short[- ]?order/i,
  },
  // Pillar D — Tools
  {
    id: 'pillar-d-generators',
    label: 'D · Plan & list generators',
    pillar: 'D',
    pattern: /meal\s*plan\s*(generator|maker)|grocery\s*list\s*(generator|maker|app)|shopping\s*list\s*(generator|maker|app)|meal\s*planner\s*(app|tool|online)/i,
  },
  {
    id: 'pillar-d-calculators',
    label: 'D · Calculators',
    pillar: 'D',
    pattern: /(calorie|protein|nutrient|water|serving|portion|recipe).{0,30}calculator|calculator.{0,30}(calorie|protein|nutrient|serving|portion|recipe)|recipe\s*scal/i,
  },
  // Pillar E — Commercial
  {
    id: 'pillar-e-family-app',
    label: 'E · Family meal planning app',
    pillar: 'E',
    pattern: /(family|household|shared).{0,25}(meal\s*plan|meal\s*app|planner|nutrition\s*app)|(meal\s*plan(ning)?|nutrition)\s*app.{0,25}(family|famil|household|shared)/i,
  },
  {
    id: 'pillar-e-family-of-n',
    label: 'E · Meal plan for family of N',
    pillar: 'E',
    pattern: /meal\s*plan.{0,25}family\s*of\s*\d|family\s*of\s*\d.{0,25}(meal|dinner|grocer)|meals?\s*for\s*(a\s*)?family\s*of\s*\d/i,
  },
  // Watchlist — NOT pursued (SEO-STRATEGY.md §2); tracked only to notice
  // accidental visibility so we don't drift into YMYL/medical territory.
  {
    id: 'watch-ymyl-kids-nutrition',
    label: 'Watch · Kids nutrient/medical (out of scope)',
    pillar: 'watch',
    pattern: /(toddler|child|kid|baby|infant).{0,30}(iron|calcium|vitamin|zinc|protein\s*(need|require)|rda|nutrient\s*need)|(iron|calcium|vitamin|zinc).{0,30}(toddler|child|kid|baby|infant)/i,
  },
  // Brand
  {
    id: 'brand',
    label: 'Brand (mintyfit)',
    pillar: 'brand',
    pattern: /minty\s*fit|mintyfit/i,
  },
]

/** Impression-weighted average position of matching rows (null when none). */
function aggregate(rows) {
  let impressions = 0
  let clicks = 0
  let weightedPos = 0
  for (const row of rows) {
    impressions += row.impressions
    clicks += row.clicks
    if (row.impressions > 0) weightedPos += row.position * row.impressions
  }
  return {
    impressions,
    clicks,
    position: impressions > 0 ? weightedPos / impressions : null,
  }
}

/** Carrier page: the landing page with the most impressions in a query×page set. */
function dominantPage(rows) {
  const byPage = new Map()
  for (const r of rows) byPage.set(r.page, (byPage.get(r.page) ?? 0) + r.impressions)
  let best = null
  for (const [page, impressions] of byPage) {
    if (!best || impressions > best.impressions) best = { page, impressions }
  }
  return best
}

export function computeFamilyStats(current, previous, queryPageCurrent = [], queryPagePrevious = []) {
  return KEYWORD_FAMILIES.map((fam) => ({
    id: fam.id,
    label: fam.label,
    pillar: fam.pillar,
    current: aggregate(current.filter((q) => fam.pattern.test(q.query))),
    previous: aggregate(previous.filter((q) => fam.pattern.test(q.query))),
    carrier: dominantPage(queryPageCurrent.filter((r) => fam.pattern.test(r.query))),
    prevCarrier: dominantPage(queryPagePrevious.filter((r) => fam.pattern.test(r.query))),
  }))
}

const BRAND_RE = /minty\s*fit|mintyfit/i

/** First family whose pattern matches the query (null = fits no family). */
export function familyForQuery(query) {
  return KEYWORD_FAMILIES.find((f) => f.pattern.test(query)) ?? null
}

/** Queries with real impressions now that were absent/invisible in the previous period. */
export function findNewQueries(current, previous, minImpressions = 10, queryPage = []) {
  const prevByQuery = new Map(previous.map((q) => [q.query, q.impressions]))
  return current
    .filter((q) => q.impressions >= minImpressions)
    .filter((q) => (prevByQuery.get(q.query) ?? 0) < minImpressions / 2)
    .filter((q) => !BRAND_RE.test(q.query))
    .sort((a, b) => b.impressions - a.impressions)
    .map((q) => {
      const carrier = dominantPage(queryPage.filter((r) => r.query === q.query))
      return carrier ? { ...q, page: carrier.page } : q
    })
}
