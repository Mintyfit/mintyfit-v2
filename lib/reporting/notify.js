/**
 * E-mail delivery of a stored weekly SEO report. Recipients come from the
 * `seo_report_recipients` admin setting (managed in Admin → SEO Reports),
 * falling back to the SEO_REPORT_RECIPIENTS env var.
 *
 * Sender: RESEND_FROM_REPORTS — a sender address verified in our own Resend
 * account (SEO-STRATEGY.md §7). Falls back to the default RESEND_FROM.
 */

import { sendEmail } from '@/lib/email/sendEmail'
import { buildReportEmail } from './email-html'
import { getReportRecipients, markReportEmailSent } from './store'

export async function sendReportEmail(report) {
  const recipients = await getReportRecipients()
  if (!recipients.trim()) {
    const error = 'No report recipients configured (Admin → SEO Reports, or SEO_REPORT_RECIPIENTS env)'
    await markReportEmailSent(report.id, error)
    return { success: false, error, recipients: '' }
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://mintyfit.com').replace(/\/$/, '')
  const adminUrl = `${appUrl}/admin/seo-reports/${report.id}`
  const mail = buildReportEmail(report, adminUrl)

  let result
  try {
    await sendEmail({
      to: recipients,
      subject: mail.subject,
      html: mail.html,
      from: process.env.RESEND_FROM_REPORTS || undefined,
    })
    result = { success: true }
  } catch (err) {
    result = { success: false, error: err instanceof Error ? err.message : 'send failed' }
  }

  await markReportEmailSent(report.id, result.success ? undefined : result.error ?? 'send failed')
  return { ...result, recipients }
}
