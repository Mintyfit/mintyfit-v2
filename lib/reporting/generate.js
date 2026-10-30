/**
 * Weekly SEO report pipeline: collect snapshot → rule-based insights → LLM
 * narrative (when ANTHROPIC_API_KEY is set) → store. E-mail delivery lives
 * in notify.js. Callers: app/api/cron/weekly-seo-report and the admin
 * "generate now" action.
 */

import { collectSnapshot } from './snapshot'
import { buildInsights, SEVERITY_ORDER } from './insights'
import { generateNarrative } from './llm'
import { listWeeklyReports, saveWeeklyReport } from './store'

export async function generateWeeklySeoReport() {
  const snapshot = await collectSnapshot()

  /* GSC backfills recent days — if last report's stored number for the same
   * period differs from this week's "previous period" pull, flag it so
   * week-over-week comparisons stay honest. */
  const recent = await listWeeklyReports(2).catch(() => [])
  const latest = recent[0]

  const insights = buildInsights(snapshot)
  const prevGsc = latest?.snapshot?.gsc
  if (
    prevGsc &&
    snapshot.gsc &&
    latest.snapshot.period.start === snapshot.period.prevStart &&
    latest.snapshot.period.end === snapshot.period.prevEnd &&
    prevGsc.current.clicks !== snapshot.gsc.previous.clicks
  ) {
    insights.push({
      area: 'seo',
      severity: 'warning',
      title: `GSC revised last week's clicks: ${prevGsc.current.clicks} → ${snapshot.gsc.previous.clicks}`,
      detail: `Period ${snapshot.period.prevStart}–${snapshot.period.prevEnd} was still preliminary when last week's report was generated; Google has since backfilled it. Week-over-week changes are always computed against the revised previous week.`,
      action: 'Compare weeks using the revised figures — last report\'s click count for the same period may differ.',
    })
    insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  }

  const narrative = (await generateNarrative(snapshot, insights)) ?? ''

  return saveWeeklyReport({
    weekStart: snapshot.period.start,
    weekEnd: snapshot.period.end,
    snapshot,
    insights,
    narrative,
  })
}
