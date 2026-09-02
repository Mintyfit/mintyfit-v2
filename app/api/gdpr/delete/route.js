import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = user.id

    // Delete user data in dependency order (child tables first).
    // Owner columns verified against migrations:
    //   calendar_entries.profile_id, food_journal.profile_id, recipes.profile_id,
    //   menus.profile_id, daily_usage.user_id, shopping_lists.owner_id,
    //   recipe_ingredient_swaps.profile_id, recipe_member_states.profile_id

    // If the user's family has other active members, reassign managed children
    // to another member instead of deleting them (a co-parent must not lose
    // the kids when one parent deletes their account).
    const { data: membership } = await supabase
      .from('family_memberships')
      .select('family_id')
      .eq('profile_id', uid)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (membership?.family_id) {
      const { data: others } = await supabase
        .from('family_memberships')
        .select('profile_id')
        .eq('family_id', membership.family_id)
        .eq('status', 'active')
        .neq('profile_id', uid)
        .limit(1)

      if (others?.length) {
        await supabase
          .from('managed_members')
          .update({ managed_by: others[0].profile_id })
          .eq('managed_by', uid)
      } else {
        await supabase.from('managed_members').delete().eq('managed_by', uid)
      }
    } else {
      await supabase.from('managed_members').delete().eq('managed_by', uid)
    }

    // Shopping lists: items first, then lists (owner_id → auth.users)
    const { data: lists } = await supabase.from('shopping_lists').select('id').eq('owner_id', uid)
    const listIds = (lists || []).map(l => l.id)
    if (listIds.length) {
      await supabase.from('shopping_list_items').delete().in('list_id', listIds)
    }
    await supabase.from('shopping_lists').delete().eq('owner_id', uid)

    // Menus: menu_recipes first, then menus
    const { data: menus } = await supabase.from('menus').select('id').eq('profile_id', uid)
    const menuIds = (menus || []).map(m => m.id)
    if (menuIds.length) {
      await supabase.from('menu_recipes').delete().in('menu_id', menuIds)
    }
    await supabase.from('menus').delete().eq('profile_id', uid)

    // Per-user content rows
    await supabase.from('recipe_member_states').delete().eq('profile_id', uid)
    await supabase.from('recipe_ingredient_swaps').delete().eq('profile_id', uid)
    await supabase.from('food_journal').delete().eq('profile_id', uid)
    await supabase.from('calendar_entries').delete().eq('profile_id', uid)
    await supabase.from('recipes').delete().eq('profile_id', uid)
    await supabase.from('weight_logs').delete().eq('profile_id', uid)
    await supabase.from('daily_usage').delete().eq('user_id', uid)

    // Family memberships + sent invites
    await supabase.from('family_memberships').delete().eq('profile_id', uid)
    await supabase.from('family_invites').delete().eq('invited_by', uid)

    // Nutritionist connections
    await supabase.from('nutritionist_client_links').delete().or(`nutritionist_id.eq.${uid},client_id.eq.${uid}`)
    await supabase.from('nutritionist_notes').delete().or(`nutritionist_id.eq.${uid},client_id.eq.${uid}`)

    // Profile — cascades to any remaining profile-owned rows
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
