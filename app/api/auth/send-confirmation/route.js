import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sendEmail'
import { confirmationEmail } from '@/lib/email/templates'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    })

    if (error) {
      console.error('[send-confirmation] generateLink error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const confirmUrl = data?.properties?.action_link
    if (!confirmUrl) {
      return NextResponse.json({ error: 'Failed to generate confirmation link' }, { status: 500 })
    }

    await sendEmail({
      to: email,
      subject: 'Confirm your MintyFit account',
      html: confirmationEmail({ confirmUrl }),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[send-confirmation] Error:', err)
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }
}
