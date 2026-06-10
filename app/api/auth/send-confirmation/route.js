import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/sendEmail'

function welcomeEmail({ magicLink }) {
  return {
    subject: 'Welcome to MintyFit — confirm your account',
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
            <a href="${magicLink}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;">Sign in to MintyFit</a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:#6b7280;">Or copy this link into your browser:<br/><span style="font-size:12px;word-break:break-all;">${magicLink}</span></p>
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
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
    const authUrl = `${supabaseUrl}/auth/v1`

    // Debug: check auth endpoint
    const settingsRes = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: serviceKey } })
    const settings = await settingsRes.json()

    // Find user by email
    const usersRes = await fetch(`${authUrl}/admin/users?filter%5Bemail%5D=${encodeURIComponent(email)}`, { headers: authHeaders })
    const usersData = await usersRes.json()
    const user = usersData.users?.[0]

    if (!user) {
      return NextResponse.json({
        error: 'User not found',
        debug: {
          email,
          usersCount: usersData.users?.length,
          totalUsers: usersData.total,
          supabaseUrl: supabaseUrl.replace(/\/\/[^@]+@/, '//***@'),
          external_email_enabled: settings?.external?.email,
          disable_signup: settings?.disable_signup,
        },
      }, { status: 404 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Auto-confirm the user's email
    await fetch(`${authUrl}/admin/users/${user.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ email_confirm: true }),
    })

    // Generate magic link
    const linkRes = await fetch(`${authUrl}/admin/generate_link`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'magiclink',
        email,
        redirect_to: 'https://mintyfit.com/auth/callback',
      }),
    })
    const linkData = await linkRes.json()
    const magicLink = linkData.action_link

    if (!magicLink) {
      return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 })
    }

    const { subject, html } = welcomeEmail({ magicLink })
    await sendEmail({ to: email, subject, html })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[send-confirmation] Error:', err)
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }
}
