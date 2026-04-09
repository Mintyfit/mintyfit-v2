import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Get user's family (must be admin/co-admin)
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
      .single()

    if (existingProfile) {
      const { data: alreadyMember } = await supabase
        .from('family_memberships')
        .select('id')
        .eq('family_id', membership.family_id)
        .eq('profile_id', existingProfile.id)
        .single()

      if (alreadyMember) return NextResponse.json({ error: 'Already a family member' }, { status: 400 })
    }

    // Create invite
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

    // In production: send email via Supabase edge function or email service
    // For now: return the invite token so it can be shared manually
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/family-invite/${invite.token}`

    return NextResponse.json({ invite, inviteUrl })
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
