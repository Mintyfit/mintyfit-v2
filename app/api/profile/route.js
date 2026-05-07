import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const fieldMap = {
      name: 'full_name',
      dietary_type: 'dietary_type',
      allergies: 'allergies',
      primary_goal: 'primary_goal',
      units: 'units_preference',
      date_of_birth: 'date_of_birth',
      gender: 'gender',
      height: 'height',
    }
    const updates = {}
    for (const [key, col] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) updates[col] = body[key]
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('profiles')
      .upsert({ id: user.id, email: user.email, ...updates, updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error) {
      console.error('[profile PATCH] Supabase error:', error)
      throw error
    }
    return NextResponse.json({ profile: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
