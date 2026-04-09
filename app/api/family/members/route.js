import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Update member role or remove member
export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { memberId, role } = await request.json()

    // Verify requester is admin
    const { data: myMembership } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', user.id)
      .single()

    if (!myMembership || !['admin', 'co-admin'].includes(myMembership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('family_memberships')
      .update({ role })
      .eq('family_id', myMembership.family_id)
      .eq('profile_id', memberId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ membership: data })
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
