import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Update member role and/or display_name; or remove member
export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { memberId, role, display_name } = await request.json()
    if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })

    // Verify requester is admin/co-admin of the same family
    const { data: myMembership } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', user.id)
      .single()

    if (!myMembership || !['admin', 'co-admin'].includes(myMembership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Verify target is in the same family
    const { data: targetMembership } = await supabase
      .from('family_memberships')
      .select('id')
      .eq('family_id', myMembership.family_id)
      .eq('profile_id', memberId)
      .single()

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not in your family' }, { status: 404 })
    }

    let membership = null
    if (role) {
      const { data, error } = await supabase
        .from('family_memberships')
        .update({ role })
        .eq('family_id', myMembership.family_id)
        .eq('profile_id', memberId)
        .select()
        .single()
      if (error) throw error
      membership = data
    }

    let profile = null
    if (typeof display_name === 'string') {
      const trimmed = display_name.trim()
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed || null })
        .eq('id', memberId)
        .select('id, display_name, full_name, first_name')
        .single()
      if (error) throw error
      profile = data
    }

    return NextResponse.json({ membership, profile })
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
    const memberId = searchParams.get('memberId')

    const { data: myMembership } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', user.id)
      .single()

    if (!myMembership) return NextResponse.json({ error: 'Not in a family' }, { status: 400 })

    // Can remove self (leave), or admin can remove others
    if (memberId !== user.id && !['admin', 'co-admin'].includes(myMembership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('family_memberships')
      .delete()
      .eq('family_id', myMembership.family_id)
      .eq('profile_id', memberId || user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
