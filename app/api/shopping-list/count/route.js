import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── GET /api/shopping-list/count ──────────────────────────────────────────────
// Lightweight endpoint — returns { count } of unchecked items only.
// Used by the cart badge in the nav.

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ count: 0 })

    // Find the user's list id
    const { data: list } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!list) return NextResponse.json({ count: 0 })

    const { count } = await supabase
      .from('shopping_list_items')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', list.id)
      .eq('checked', false)

    return NextResponse.json({ count: count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
