import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify user is a nutritionist
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'nutritionist') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { clientId, content } = await request.json()
    if (!clientId || !content) return NextResponse.json({ error: 'clientId and content required' }, { status: 400 })

    // Verify link exists
    const { data: link } = await supabase
      .from('nutritionist_client_links')
      .select('id')
      .eq('nutritionist_id', user.id)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .single()

    if (!link) return NextResponse.json({ error: 'Client not linked' }, { status: 403 })

    const { data: note, error } = await supabase
      .from('nutritionist_notes')
      .insert({ nutritionist_id: user.id, client_id: clientId, content })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ note })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
