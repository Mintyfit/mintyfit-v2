import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch family members with measurements
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('family_members')
      .select('*, measurements(*)')
      .eq('profile_id', user.id)
      .order('created_at')

    if (error) throw error
    return NextResponse.json({ members: data || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Add a new family member
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { data, error } = await supabase
      .from('family_members')
      .insert({ ...body, profile_id: user.id })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ member: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH: Update a family member
export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, ...updates } = await request.json()
    const allowed = ['name', 'gender', 'date_of_birth', 'allergies']
    const filtered = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) filtered[key] = updates[key]
    }

    const { data, error } = await supabase
      .from('family_members')
      .update({ ...filtered, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ member: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: Remove a family member
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
