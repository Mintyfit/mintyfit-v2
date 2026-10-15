/**
 * Snapshot orchestrator: pulls GSC + GA4 + blog publishing activity for the
 * weekly period and merges them into one ReportSnapshot. Each source is
 * isolated — a failing API (expired token, missing env, DB hiccup) is
 * recorded in `errors` and never aborts the rest of the report.
 */

import { pullGa4 } from './ga4'
import { pullGsc } from './gsc'
import { pullBlogActivity } from './blog'
import { weeklyPeriod } from './google-auth'

async function attempt(errors, label, fn) {
  try {
    return await fn()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`${label}: ${message.slice(0, 300)}`)
    return null
  }
}

export async function collectSnapshot(now = new Date()) {
  const period = weeklyPeriod(now)
  const errors = []

  const [gsc, ga4, blog] = await Promise.all([
    attempt(errors, 'GSC', () => pullGsc(period)),
    attempt(errors, 'GA4', () => pullGa4(period)),
    attempt(errors, 'Blog', () => pullBlogActivity(period, now)),
  ])

  return {
    generatedAt: now.toISOString(),
    period,
    gsc,
    ga4,
    blog,
    errors,
  }
}
