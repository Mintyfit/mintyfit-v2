import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    // Use user client only for auth — DB writes use admin to bypass RLS
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const admin = createAdminClient()

    // Validate invite
    const { data: invite } = await admin
      .from('family_invites')
      .select('id, family_id, email, status, expires_at')
      .eq('token', token)
      .single()

    if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
    if (invite.status !== 'pending') return NextResponse.json({ error: 'Invite already used or cancelled' }, { status: 400 })
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Check not already in a family
    const { data: existing } = await admin
      .from('family_memberships')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'You are already in a family' }, { status: 400 })

    // Join family — admin client bypasses RLS so the invitee can insert their own row
    const { error: joinError } = await admin
      .from('family_memberships')
      .insert({
        family_id: invite.family_id,
        profile_id: user.id,
        role: 'member',
      })

    if (joinError) throw joinError

    // Mark invite as accepted
    await admin
      .from('family_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
