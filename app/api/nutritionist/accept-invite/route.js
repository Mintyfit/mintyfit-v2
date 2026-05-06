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
      .from('nutritionist_invites')
      .select('id, nutritionist_id, email, status, expires_at')
      .eq('token', token)
      .single()

    if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invite already used or cancelled' }, { status: 400 })
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Create the nutritionist_client_link
    const { error: linkError } = await supabase
      .from('nutritionist_client_links')
      .insert({
        nutritionist_id: invite.nutritionist_id,
        client_id: user.id,
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      // Handle duplicate - update existing
      .onConflict('nutritionist_id,client_id')
      .update({ status: 'active', accepted_at: new Date().toISOString() })

    if (linkError) throw linkError

    // Mark invite as accepted
    await supabase
      .from('nutritionist_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
