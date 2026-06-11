import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'nutritionist' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Not a nutritionist' }, { status: 403 })
    }

    const { display_name, bio, credentials_url, avatar_url } = await request.json()
    const updates = {}
    if (display_name !== undefined) updates.display_name = display_name
    if (bio !== undefined) updates.bio = bio
    if (credentials_url !== undefined) updates.credentials_url = credentials_url
    if (avatar_url !== undefined) updates.avatar_url = avatar_url

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('display_name, bio, credentials_url, avatar_url')
      .single()

    if (error) throw error
    return NextResponse.json({ profile: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, bio, credentials_url, avatar_url, role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'nutritionist' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Not a nutritionist' }, { status: 403 })
    }

    return NextResponse.json({ profile })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
