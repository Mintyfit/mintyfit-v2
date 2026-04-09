import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name } = await request.json()

    // Check if user already has a family
    const { data: existing } = await supabase
      .from('family_memberships')
      .select('family_id')
      .eq('profile_id', user.id)
      .limit(1)
      .single()

    if (existing) return NextResponse.json({ error: 'Already in a family' }, { status: 400 })

    // Create family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({ name: name || 'My Family', created_by: user.id })
      .select()
      .single()

    if (familyError) throw familyError

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('family_memberships')
      .insert({ family_id: family.id, profile_id: user.id, role: 'admin' })

    if (memberError) throw memberError

    return NextResponse.json({ family })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
