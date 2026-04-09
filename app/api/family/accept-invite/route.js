import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    // Validate invite
    const { data: invite } = await supabase
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
    const { data: existing } = await supabase
      .from('family_memberships')
      .select('id')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'You are already in a family' }, { status: 400 })

    // Join family
    const { error: joinError } = await supabase
      .from('family_memberships')
      .insert({
        family_id: invite.family_id,
        profile_id: user.id,
        role: 'member',
        status: 'active',
      })

    if (joinError) throw joinError

    // Mark invite as accepted
    await supabase
      .from('family_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
