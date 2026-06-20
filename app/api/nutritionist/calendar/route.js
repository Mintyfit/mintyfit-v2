import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function verifyLink(userId, clientId) {
  const supabase = await createClient()
  const { data: link } = await supabase
    .from('nutritionist_client_links')
    .select('id')
    .eq('nutritionist_id', userId)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()
  return !!link
}

// Save a recipe to a client's calendar
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { clientId, date_str, meal_type, recipe_id, recipe_name, consumer_member_ids, personal_nutrition } = await request.json()

    if (!clientId || !date_str || !meal_type || !recipe_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!(await verifyLink(user.id, clientId))) {
      return NextResponse.json({ error: 'No active link to this client' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Get client's family_id so entries appear in their family plan
    const { data: membership } = await adminClient
      .from('family_memberships')
      .select('family_id')
      .eq('profile_id', clientId)
      .eq('status', 'active')
      .maybeSingle()

    const clientFamilyId = membership?.family_id || null

    const { data: entry, error } = await adminClient
      .from('calendar_entries')
      .upsert({
        profile_id: clientId,
        family_id: clientFamilyId,
        date_str,
        meal_type,
        recipe_id,
        recipe_name: recipe_name || '',
        member_id: null,
        consumer_member_ids: consumer_member_ids || [],
        personal_nutrition: personal_nutrition || null,
        origin: 'planned',
      }, { onConflict: 'family_id,date_str,meal_type,recipe_id,origin' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ entry })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Remove an entry from a client's calendar
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('id')
    const clientId = searchParams.get('clientId')

    if (!entryId || !clientId) {
      return NextResponse.json({ error: 'Missing id or clientId' }, { status: 400 })
    }

    if (!(await verifyLink(user.id, clientId))) {
      return NextResponse.json({ error: 'No active link to this client' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('calendar_entries')
      .delete()
      .eq('id', entryId)
      .eq('profile_id', clientId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
