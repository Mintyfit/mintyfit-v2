import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sendEmail'
import { nutritionistApplicationReceivedEmail } from '@/lib/email/templates'
import { logAudit } from '@/lib/admin/audit'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { display_name, bio, credentials_url } = await request.json()

    if (!bio) {
      return NextResponse.json({ error: 'Bio is required' }, { status: 400 })
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'nutritionist',
        is_approved: false,
        bio,
        credentials_url: credentials_url || null,
        applied_at: new Date().toISOString(),
        ...(display_name ? { display_name } : {}),
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    // Log audit
    await logAudit({
      actorId: user.id,
      action: 'nutritionist_application_submitted',
      targetId: user.id,
      targetType: 'profile',
    })

    // Get user's name for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, name, email')
      .eq('id', user.id)
      .single()

    const name = profile?.display_name || profile?.name || profile?.email || 'there'

    // Send confirmation email
    try {
      await sendEmail({
        to: profile?.email || user.email,
        subject: 'We received your nutritionist application',
        html: nutritionistApplicationReceivedEmail({ name }),
      })
    } catch (e) {
      console.error('Application confirmation email failed:', e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
