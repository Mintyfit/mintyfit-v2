'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/guard'
import { logAudit } from '@/lib/admin/audit'
import { generateWeeklySeoReport } from '@/lib/reporting/generate'
import { sendReportEmail } from '@/lib/reporting/notify'
import { deleteWeeklyReports, getWeeklyReport, saveReportRecipients } from '@/lib/reporting/store'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await requireAdmin(user?.id)
  return user?.id
}

/** Generate the current week's report now (no e-mail). */
export async function generateNow() {
  await requireSuperAdmin()
  const report = await generateWeeklySeoReport()
  revalidatePath('/admin/seo-reports')
  return { id: report.id, insights: report.insights.length, errors: report.snapshot.errors }
}

/** Re-send the report e-mail for an existing report. */
export async function resendEmail(formData) {
  await requireSuperAdmin()
  const id = Number(formData.get('id'))
  const report = await getWeeklyReport(id)
  if (!report) throw new Error('Report not found')
  const result = await sendReportEmail(report)
  revalidatePath('/admin/seo-reports')
  revalidatePath(`/admin/seo-reports/${id}`)
  return result
}

/** Delete reports (comma-separated ids in the form field "ids"). */
export async function removeReports(formData) {
  const actorId = await requireSuperAdmin()
  const ids = String(formData.get('ids') ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
  const deleted = await deleteWeeklyReports(ids)
  await logAudit({ actorId, action: 'admin.seo-reports.delete', targetId: ids.join(','), targetType: 'seo_weekly_reports' })
  revalidatePath('/admin/seo-reports')
  return { deleted }
}

/** Save the report recipient list ("clients" who receive the weekly e-mail). */
export async function saveRecipients(formData) {
  const actorId = await requireSuperAdmin()
  const raw = String(formData.get('recipients') ?? '')
  const emails = raw
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const email of emails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Invalid e-mail: ${email}`)
  }
  const value = emails.join(', ')
  await saveReportRecipients(value)
  await logAudit({ actorId, action: 'admin.seo-reports.recipients', targetId: value, targetType: 'admin_settings' })
  revalidatePath('/admin/seo-reports')
  return { saved: true, count: emails.length }
}
