/**
 * GA4 Data API pulls for the weekly SEO report: weekly overview (current vs
 * previous), channels, top pages, and a per-day session series for the
 * tracking-health check.
 */

import { getGoogleAccessToken, postJson } from './google-auth'

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']

const num = (v) => (v ? Number(v) : 0)

export async function pullGa4(period) {
  const propertyId = process.env.GA4_PROPERTY_ID
  if (!propertyId) throw new Error('GA4_PROPERTY_ID is not set')
  const token = await getGoogleAccessToken(SCOPES)
  const run = (body) =>
    postJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, token, body)

  const current = { startDate: period.start, endDate: period.end, name: 'current' }
  const previous = { startDate: period.prevStart, endDate: period.prevEnd, name: 'previous' }

  const overview = await run({
    dateRanges: [current, previous],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'engagementRate' },
      { name: 'keyEvents' },
    ],
  })
  const toMetricSet = (vals) => ({
    sessions: num(vals?.[0]?.value),
    users: num(vals?.[1]?.value),
    newUsers: num(vals?.[2]?.value),
    engagementRate: num(vals?.[3]?.value),
    keyEvents: num(vals?.[4]?.value),
  })
  const curRow = overview.rows?.find((r) => r.dimensionValues?.[0]?.value === 'current')?.metricValues
  const prevRow = overview.rows?.find((r) => r.dimensionValues?.[0]?.value === 'previous')?.metricValues

  const channelsReport = await run({
    dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  })
  const channels = (channelsReport.rows ?? []).map((r) => ({
    channel: r.dimensionValues?.[0]?.value ?? '?',
    sessions: num(r.metricValues?.[0]?.value),
    keyEvents: num(r.metricValues?.[1]?.value),
  }))

  const pagesReport = await run({
    dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 15,
  })
  const topPages = (pagesReport.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? '?',
    sessions: num(r.metricValues?.[0]?.value),
  }))

  const dailyReport = await run({
    dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
    limit: 31,
  })
  const daily = (dailyReport.rows ?? []).map((r) => ({
    date: r.dimensionValues?.[0]?.value ?? '',
    sessions: num(r.metricValues?.[0]?.value),
  }))

  return {
    current: toMetricSet(curRow ?? overview.totals?.[0]?.metricValues),
    previous: toMetricSet(prevRow),
    channels,
    topPages,
    daily,
  }
}
