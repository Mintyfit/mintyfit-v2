import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sendEmail'
import { nutritionistInviteEmail } from '@/lib/email/templates'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''

function buildLinks(token, email) {
  const accept = `${APP_URL}/nutritionist-invite/${token}`
  const signup = `${APP_URL}/nutritionist-invite/${token}?signup=1&email=${encodeURIComponent(email)}`
  return { accept, signup }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved, name, email')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'nutritionist' || profile?.is_approved !== true) {
      return NextResponse.json({ error: 'Only approved nutritionists can invite clients' }, { status: 403 })
    }

    const { email, message } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const cleanEmail = email.toLowerCase().trim()

    // Check if already connected
    const { data: existingLink } = await supabase
      .from('nutritionist_client_links')
      .select('id, status')
      .eq('nutritionist_id', user.id)
      .maybeSingle()

    // Re-use existing pending invite if present
    const { data: existingInvite } = await supabase
      .from('nutritionist_invites')
      .select('*')
      .eq('nutritionist_id', user.id)
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .maybeSingle()

    let invite = existingInvite
    if (!invite) {
      const { data: created, error } = await supabase
        .from('nutritionist_invites')
        .insert({
          nutritionist_id: user.id,
          email: cleanEmail,
          message: message || null,
        })
        .select()
        .single()
      if (error) throw error
      invite = created
    }

    const nutritionistName = profile.name || profile.email || 'A nutritionist'
    const { accept, signup } = buildLinks(invite.token, cleanEmail)

    let emailStatus = 'sent'
    try {
      await sendEmail({
        to: cleanEmail,
        subject: `${nutritionistName} would like to connect with you on MintyFit`,
        html: nutritionistInviteEmail({
          nutritionistName,
          acceptUrl: accept,
          signupUrl: signup,
          message,
        }),
        replyTo: profile.email,
      })
    } catch (e) {
      emailStatus = 'failed'
      console.error('Nutritionist invite email failed:', e)
    }

    return NextResponse.json({ invite, inviteUrl: accept, emailStatus })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: invites } = await supabase
      .from('nutritionist_invites')
      .select('*')
      .eq('nutritionist_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ invites: invites || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Cancel a pending invite
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase
      .from('nutritionist_invites')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('nutritionist_id', user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Resend an existing pending invite
export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved, name, email')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'nutritionist' || profile?.is_approved !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: invite } = await supabase
      .from('nutritionist_invites')
      .select('*')
      .eq('id', id)
      .eq('nutritionist_id', user.id)
      .single()

    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    if (invite.status !== 'pending') return NextResponse.json({ error: 'Invite is not pending' }, { status: 400 })

    const nutritionistName = profile.name || profile.email || 'A nutritionist'
    const { accept, signup } = buildLinks(invite.token, invite.email)

    await sendEmail({
      to: invite.email,
      subject: `Reminder: connect with ${nutritionistName} on MintyFit`,
      html: nutritionistInviteEmail({
        nutritionistName,
        acceptUrl: accept,
        signupUrl: signup,
        message: invite.message,
      }),
      replyTo: profile.email,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
