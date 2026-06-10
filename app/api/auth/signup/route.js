import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/sendEmail'

function welcomeEmail({ link }) {
  return {
    subject: 'Welcome to MintyFit!',
    html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f0f0;">
          <a href="https://mintyfit.com" style="text-decoration:none;color:#2d6e2e;font-weight:700;font-size:20px;">MintyFit</a>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1f2937;">Welcome to MintyFit!</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#1f2937;">Your account has been created. Click the button below to sign in and get started with personalized family nutrition.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#2d6e2e;">
            <a href="${link}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;">Sign in to MintyFit</a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:#6b7280;">Or copy this link into your browser:<br/><span style="font-size:12px;word-break:break-all;">${link}</span></p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;font-size:12px;color:#6b7280;">
          MintyFit — family nutrition done right.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  }
}

export async function POST(request) {
  try {
    const { email, password, fullName } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '')
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://mintyfit.com'
    const authUrl = `${supabaseUrl}/auth/v1`

    // Admin API uses service role key
    const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

    // Create user via Admin API — no automatic confirmation email sent
    const createRes = await fetch(`${authUrl}/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { onboarding_pending: true, ...(fullName ? { full_name: fullName } : {}) },
      }),
    })
    if (!createRes.ok) {
      const text = await createRes.text()
      let detail
      try { const j = JSON.parse(text); detail = j.msg || j.error || text.substring(0, 200) } catch { detail = text.substring(0, 200) }
      return NextResponse.json({ error: 'Failed to create user', detail }, { status: 400 })
    }

    // Password grant uses anon key (user-facing endpoint, not admin)
    const tokenRes = await fetch(`${authUrl}/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      return NextResponse.json({ error: 'Failed to create session', detail: text.substring(0, 200) }, { status: 500 })
    }
    const tokenData = await tokenRes.json()

    // Base64 encode both tokens (safe for URLs — replace +/ with -_)
    const encoded = Buffer.from(JSON.stringify({
      at: tokenData.access_token,
      rt: tokenData.refresh_token,
      ts: Date.now(),
    })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const signInLink = `${origin}/auth/handle-session?t=${encoded}`

    const { subject, html } = welcomeEmail({ link: signInLink })
    await sendEmail({ to: email, subject, html })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[auth-signup] Error:', err)
    return NextResponse.json({ error: 'Failed to sign up', detail: err?.message?.substring(0, 200) }, { status: 500 })
  }
}
