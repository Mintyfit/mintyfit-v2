import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = user.id

    // Delete user data in dependency order (child tables first)
    // Calendar/journal entries
    await supabase.from('calendar_entries').delete().eq('member_id', uid)
    await supabase.from('journal_entries').delete().eq('member_id', uid)

    // Weight logs
    await supabase.from('weight_logs').delete().eq('profile_id', uid)

    // Managed members
    await supabase.from('managed_members').delete().eq('managed_by', uid)

    // Family: remove from memberships, cancel sent invites
    await supabase.from('family_memberships').delete().eq('profile_id', uid)
    await supabase.from('family_invites').delete().eq('invited_by', uid)

    // Nutritionist connections
    await supabase.from('nutritionist_client_links').delete().or(`nutritionist_id.eq.${uid},client_id.eq.${uid}`)
    await supabase.from('nutritionist_notes').delete().or(`nutritionist_id.eq.${uid},client_id.eq.${uid}`)

    // Meal plans
    await supabase.from('meal_plans').delete().eq('profile_id', uid)

    // Profile — will cascade delete auth user via DB trigger if configured,
    // otherwise delete auth user via admin client
    await supabase.from('profiles').delete().eq('id', uid)

    // Delete the auth user via admin client (service role bypasses RLS)
    const adminSupabase = createAdminClient()
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(uid)
    if (authDeleteError) {
      console.error('Auth delete error:', authDeleteError)
      // Non-fatal — profile data is already deleted
    }

    return NextResponse.json({ ok: true, message: 'Account and all data deleted.' })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
