import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const { data: membership } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', user.id)
      .single()

    if (!membership) return NextResponse.json({ error: 'Not in a family' }, { status: 400 })
    if (!['admin', 'co-admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('managed_members')
      .insert({
        family_id: membership.family_id,
        managed_by: user.id,
        name: body.name,
        date_of_birth: body.date_of_birth || null,
        gender: body.gender || null,
        weight: body.weight || null,
        height: body.height || null,
        allergies: body.allergies || [],
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ member: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, ...updates } = await request.json()
    const allowed = ['name', 'date_of_birth', 'gender', 'weight', 'height', 'allergies']
    const filtered = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) filtered[key] = updates[key]
    }

    const { data, error } = await supabase
      .from('managed_members')
      .update({ ...filtered, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('managed_by', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ member: data })
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
    const id = searchParams.get('id')

    const { error } = await supabase
      .from('managed_members')
      .delete()
      .eq('id', id)
      .eq('managed_by', user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
