import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.RESEND_FROM || 'MintyFit <info@mintyfit.com>'

export async function sendEmail({ to, subject, html, replyTo }) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', to)
    return { skipped: true }
  }
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    replyTo,
  })
  if (error) {
    console.error('[email] send failed:', error)
    throw new Error(error.message || 'Email send failed')
  }
  return { id: data?.id }
}
