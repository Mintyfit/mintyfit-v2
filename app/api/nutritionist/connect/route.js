import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Connect client to nutritionist by email
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email } = await request.json()

    // Find nutritionist by email
    const { data: nutritionistProfile } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!nutritionistProfile) {
      return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })
    }

    if (nutritionistProfile.role !== 'nutritionist') {
      return NextResponse.json({ error: 'That user is not a registered nutritionist' }, { status: 400 })
    }

    // Create link (or re-activate if exists)
    const { data: link, error } = await supabase
      .from('nutritionist_client_links')
      .upsert({
        nutritionist_id: nutritionistProfile.id,
        client_id: user.id,
        status: 'active',
      }, { onConflict: 'nutritionist_id,client_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ link })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Disconnect nutritionist
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('nutritionist_client_links')
      .update({ status: 'inactive' })
      .eq('client_id', user.id)
      .eq('status', 'active')

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
