import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Add a new measurement
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { familyMemberId, ...measurementData } = body

    // Verify the family member belongs to this user
    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', familyMemberId)
      .eq('profile_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Family member not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('measurements')
      .insert({ ...measurementData, family_member_id: familyMemberId })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ measurement: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH: Update a measurement
export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, ...updates } = await request.json()
    const allowed = ['weight_kg', 'height_cm', 'notes', 'is_pregnant', 'is_breastfeeding', 'recorded_at']
    const filtered = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) filtered[key] = updates[key]
    }

    // Verify ownership
    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const { data, error } = await supabase
      .from('measurements')
      .update(filtered)
      .eq('id', id)
      .eq('family_member_id', member.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ measurement: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
