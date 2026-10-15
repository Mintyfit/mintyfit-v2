/**
 * Search Console pulls for the weekly SEO report: totals, full query sets for
 * both weeks (family aggregation + position movement), top pages, and
 * query×page rows (which landing page Google serves per query — carrier-page
 * insights and carrier-swap detection).
 * Methodology: SEO-STRATEGY.md §6.
 */

import { getGoogleAccessToken, postJson } from './google-auth'
import { computeFamilyStats, findNewQueries } from './keyword-families'

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
/** Full query set per period. */
const QUERY_ROW_LIMIT = 5000
/** Query×page rows — the cartesian set is larger than the query set. */
const QUERY_PAGE_ROW_LIMIT = 25000
/** How many current-period queries are kept in the stored snapshot. */
const SNAPSHOT_QUERY_LIMIT = 100

function daysBetween(start, end) {
  const ms = new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()
  return Math.round(ms / 86_400_000) + 1
}

const toQuery = (row) => ({
  query: row.keys?.[0] ?? '?',
  clicks: row.clicks,
  impressions: row.impressions,
  ctr: row.ctr,
  position: row.position,
})

const toQueryPage = (row) => ({
  query: row.keys?.[0] ?? '?',
  page: row.keys?.[1] ?? '?',
  clicks: row.clicks,
  impressions: row.impressions,
  position: row.position,
})

export async function pullGsc(period) {
  const siteUrl = process.env.GSC_SITE_URL
  if (!siteUrl) throw new Error('GSC_SITE_URL is not set')
  const token = await getGoogleAccessToken(SCOPES)
  const site = encodeURIComponent(siteUrl)
  const query = (body) =>
    postJson(`https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`, token, body)

  const toTotals = (rows, days) => {
    const t = rows?.[0]
    return {
      clicks: t?.clicks ?? 0,
      impressions: t?.impressions ?? 0,
      ctr: t?.ctr ?? 0,
      position: t?.position ?? 0,
      days,
    }
  }

  const [totalsCur, totalsPrev, queriesCur, queriesPrev, pagesCur, queryPageCur, queryPagePrev] = await Promise.all([
    query({ startDate: period.start, endDate: period.end, dimensions: [] }),
    query({ startDate: period.prevStart, endDate: period.prevEnd, dimensions: [] }),
    query({ startDate: period.start, endDate: period.end, dimensions: ['query'], rowLimit: QUERY_ROW_LIMIT }),
    query({ startDate: period.prevStart, endDate: period.prevEnd, dimensions: ['query'], rowLimit: QUERY_ROW_LIMIT }),
    query({ startDate: period.start, endDate: period.end, dimensions: ['page'], rowLimit: 25 }),
    query({ startDate: period.start, endDate: period.end, dimensions: ['query', 'page'], rowLimit: QUERY_PAGE_ROW_LIMIT }),
    query({ startDate: period.prevStart, endDate: period.prevEnd, dimensions: ['query', 'page'], rowLimit: QUERY_PAGE_ROW_LIMIT }),
  ])

  const curQueries = (queriesCur.rows ?? []).map(toQuery)
  const prevQueries = (queriesPrev.rows ?? []).map(toQuery)
  const byImpressions = [...curQueries].sort((a, b) => b.impressions - a.impressions)
  const qpCur = (queryPageCur.rows ?? []).map(toQueryPage)
  const qpPrev = (queryPagePrev.rows ?? []).map(toQueryPage)

  const topPages = (pagesCur.rows ?? []).map((r) => ({
    page: r.keys?.[0] ?? '?',
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }))

  return {
    current: toTotals(totalsCur.rows, daysBetween(period.start, period.end)),
    previous: toTotals(totalsPrev.rows, daysBetween(period.prevStart, period.prevEnd)),
    topQueries: byImpressions.slice(0, SNAPSHOT_QUERY_LIMIT),
    prevQueries,
    topPages,
    families: computeFamilyStats(curQueries, prevQueries, qpCur, qpPrev),
    newQueries: findNewQueries(curQueries, prevQueries, 10, qpCur).slice(0, 25),
  }
}
