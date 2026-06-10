import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/sendEmail'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://mintyfit.com'
    const loginLink = `${origin}/login`

    await sendEmail({
      to: email,
      subject: 'Sign in to MintyFit',
      html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f0f0;">
          <a href="https://mintyfit.com" style="text-decoration:none;color:#2d6e2e;font-weight:700;font-size:20px;">MintyFit</a>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1f2937;">Your MintyFit account is ready!</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#1f2937;">Click below to sign in and start planning your family meals.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#2d6e2e;">
            <a href="${loginLink}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;">Sign in to MintyFit</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;font-size:12px;color:#6b7280;">
          MintyFit — family nutrition done right.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[send-confirmation] Error:', err)
    return NextResponse.json({ error: 'Failed to send confirmation email', detail: err?.message?.substring(0, 200) }, { status: 500 })
  }
}
