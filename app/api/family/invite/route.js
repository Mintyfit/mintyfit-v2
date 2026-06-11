import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function sendInviteEmail({ to, inviteUrl, familyName, inviterName }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_api_key' }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'MintyFit <noreply@mintyfit.com>',
      to,
      subject: `${inviterName} invited you to join ${familyName} on MintyFit`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="margin:0 0 8px">You've been invited! 👨‍👩‍👧‍👦</h2>
          <p style="color:#555;margin:0 0 24px">
            <strong>${inviterName}</strong> has invited you to join
            <strong>${familyName}</strong> on MintyFit — a family nutrition and meal planning platform.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:16px">
            Accept invite
          </a>
          <p style="color:#999;font-size:13px;margin-top:24px">
            This link expires in 7 days. If you don't have an account yet, you'll be able to create one after clicking the link.
          </p>
        </div>
      `,
    }),
  })

  return { ok: res.ok, status: res.status }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const { data: membership } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', user.id)
      .single()

    if (!membership) return NextResponse.json({ error: 'You are not in a family' }, { status: 400 })
    if (!['admin', 'co-admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })
    }

    // Check not already a member
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      const { data: alreadyMember } = await supabase
        .from('family_memberships')
        .select('id')
        .eq('family_id', membership.family_id)
        .eq('profile_id', existingProfile.id)
        .maybeSingle()

      if (alreadyMember) return NextResponse.json({ error: 'Already a family member' }, { status: 400 })
    }

    const [{ data: family }, { data: inviterProfile }] = await Promise.all([
      supabase.from('families').select('name').eq('id', membership.family_id).single(),
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    ])

    // Remove any existing pending invites for this email so we start fresh
    await supabase
      .from('family_invites')
      .delete()
      .eq('family_id', membership.family_id)
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'pending')

    const { data: invite, error } = await supabase
      .from('family_invites')
      .insert({
        family_id: membership.family_id,
        invited_by: user.id,
        email: email.toLowerCase().trim(),
      })
      .select()
      .single()

    if (error) throw error

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/family-invite/${invite.token}`

    const emailResult = await sendInviteEmail({
      to: email,
      inviteUrl,
      familyName: family?.name || 'the family',
      inviterName: inviterProfile?.full_name || 'Someone',
    })

    return NextResponse.json({
      invite,
      inviteUrl,
      emailSent: emailResult.ok,
      emailNote: emailResult.reason === 'no_api_key' ? 'No RESEND_API_KEY configured — share the link manually.' : null,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')
    if (!inviteId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: membership } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', user.id)
      .single()

    if (!membership || !['admin', 'co-admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('family_invites')
      .delete()
      .eq('id', inviteId)
      .eq('family_id', membership.family_id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('family_memberships')
      .select('family_id')
      .eq('profile_id', user.id)
      .single()

    if (!membership) return NextResponse.json({ invites: [] })

    const { data: invites } = await supabase
      .from('family_invites')
      .select('*')
      .eq('family_id', membership.family_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ invites: invites || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
