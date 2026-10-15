/**
 * Storage for weekly SEO reports. Primary: seo_weekly_reports table
 * (supabase/migrations/063_seo_weekly_reports.sql). Fallback:
 * data/seo-weekly-reports.json when Supabase is unreachable.
 * One report per week — re-generating the same week upserts (replaces) it.
 */

import { createAdminClient } from '@/lib/supabase/server'

const MAX_STORED = 156 // ~3 years of weekly reports

async function jsonFilePath() {
  const path = await import('path')
  return path.join(process.cwd(), 'data', 'seo-weekly-reports.json')
}

async function readJsonReports() {
  const { promises: fs } = await import('fs')
  try {
    const raw = await fs.readFile(await jsonFilePath(), 'utf-8')
    const parsed = JSON.parse(raw)
    const rows = Array.isArray(parsed) ? parsed : parsed?.reports
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

async function writeJsonReports(rows) {
  const { promises: fs } = await import('fs')
  const path = await import('path')
  const file = await jsonFilePath()
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify({ reports: rows }, null, 2), 'utf-8')
}

function rowToReport(row) {
  return {
    id: row.id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    createdAt: new Date(row.created_at).toISOString(),
    snapshot: row.snapshot,
    insights: Array.isArray(row.insights) ? row.insights : [],
    narrative: row.narrative ?? '',
    emailSentAt: row.email_sent_at ? new Date(row.email_sent_at).toISOString() : null,
    emailError: row.email_error ?? '',
  }
}

/** Insert or replace the report for the given week. Returns the stored row. */
export async function saveWeeklyReport(input) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('seo_weekly_reports')
      .upsert(
        {
          week_start: input.weekStart,
          week_end: input.weekEnd,
          created_at: new Date().toISOString(),
          snapshot: input.snapshot,
          insights: input.insights,
          narrative: input.narrative,
          email_sent_at: null,
          email_error: '',
        },
        { onConflict: 'week_start,week_end' },
      )
      .select()
      .single()
    if (error) throw error
    return rowToReport(data)
  } catch (error) {
    console.error('DB report save failed, falling back to JSON storage:', error)
  }

  const rows = await readJsonReports()
  const nextId = rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1
  const report = {
    id: nextId,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    createdAt: new Date().toISOString(),
    snapshot: input.snapshot,
    insights: input.insights,
    narrative: input.narrative,
    emailSentAt: null,
    emailError: '',
  }
  const rest = rows.filter((r) => !(r.weekStart === input.weekStart && r.weekEnd === input.weekEnd))
  rest.unshift(report)
  await writeJsonReports(rest.slice(0, MAX_STORED))
  return report
}

/** Newest first. */
export async function listWeeklyReports(limit = 104) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('seo_weekly_reports')
      .select('*')
      .order('week_end', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map(rowToReport)
  } catch (error) {
    console.error('DB report list failed, falling back to JSON storage:', error)
  }
  const rows = await readJsonReports()
  return rows.sort((a, b) => b.weekEnd.localeCompare(a.weekEnd)).slice(0, limit)
}

export async function getWeeklyReport(id) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('seo_weekly_reports')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return rowToReport(data)
  } catch (error) {
    console.error('DB report read failed, falling back to JSON storage:', error)
  }
  const rows = await readJsonReports()
  return rows.find((r) => Number(r.id) === Number(id)) ?? null
}

/** Delete reports by id. Returns the number of deleted rows. */
export async function deleteWeeklyReports(ids) {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return 0
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('seo_weekly_reports')
      .delete()
      .in('id', unique)
      .select('id')
    if (error) throw error
    return (data ?? []).length
  } catch (error) {
    console.error('DB report delete failed, falling back to JSON storage:', error)
  }
  const rows = await readJsonReports()
  const keep = rows.filter((r) => !unique.includes(Number(r.id)))
  await writeJsonReports(keep)
  return rows.length - keep.length
}

export async function markReportEmailSent(id, error) {
  const sentAt = error ? null : new Date().toISOString()
  const errorText = error ?? ''
  try {
    const supabase = createAdminClient()
    const { error: dbError } = await supabase
      .from('seo_weekly_reports')
      .update({ email_sent_at: sentAt, email_error: errorText })
      .eq('id', id)
    if (dbError) throw dbError
    return
  } catch (err) {
    console.error('DB report email-mark failed, falling back to JSON storage:', err)
  }
  const rows = await readJsonReports()
  const row = rows.find((r) => Number(r.id) === Number(id))
  if (row) {
    row.emailSentAt = sentAt
    row.emailError = errorText
    await writeJsonReports(rows)
  }
}

/**
 * Report e-mail recipients: admin setting `seo_report_recipients`
 * (comma-separated, managed in Admin → SEO Reports), falling back to the
 * SEO_REPORT_RECIPIENTS env var, then to no recipients.
 */
export async function getReportRecipients() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'seo_report_recipients')
      .single()
    if (!error && data?.value) return data.value
  } catch {
    // fall through to env fallback
  }
  return process.env.SEO_REPORT_RECIPIENTS ?? ''
}

/** Save the recipients list (comma-separated emails). */
export async function saveReportRecipients(value) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key: 'seo_report_recipients', value, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}
