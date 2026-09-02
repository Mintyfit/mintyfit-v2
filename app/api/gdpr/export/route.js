import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = user.id

    // Collect all user data in parallel.
    // Owner columns (verified against migrations): recipes.profile_id,
    // food_journal.profile_id, daily_usage.user_id, shopping_lists.owner_id,
    // calendar_entries.profile_id, menus.profile_id.
    const [
      profileResult,
      calendarResult,
      journalResult,
      weightResult,
      recipesResult,
      menusResult,
      swapsResult,
      memberStatesResult,
      usageResult,
      listsResult,
      notesResult,
      familyResult,
      managedResult,
      invitesResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('calendar_entries').select('*').eq('profile_id', uid),
      supabase.from('food_journal').select('*').eq('profile_id', uid),
      supabase.from('weight_logs').select('*').eq('profile_id', uid).order('logged_date', { ascending: false }),
      supabase.from('recipes').select('*').eq('profile_id', uid),
      supabase.from('menus').select('*').eq('profile_id', uid),
      supabase.from('recipe_ingredient_swaps').select('*').eq('profile_id', uid),
      supabase.from('recipe_member_states').select('*').eq('profile_id', uid),
      supabase.from('daily_usage').select('*').eq('user_id', uid),
      supabase.from('shopping_lists').select('*').eq('owner_id', uid),
      supabase.from('nutritionist_notes').select('id, content, created_at').eq('client_id', uid),
      supabase.from('family_memberships').select('family_id, role, status, created_at, families(name)').eq('profile_id', uid),
      supabase.from('managed_members').select('*').eq('managed_by', uid),
      supabase.from('family_invites').select('*').eq('invited_by', uid),
    ])

    // Shopping list items for the user's lists
    const listIds = (listsResult.data || []).map(l => l.id)
    let shoppingItems = []
    if (listIds.length) {
      const { data } = await supabase.from('shopping_list_items').select('*').in('list_id', listIds)
      shoppingItems = data || []
    }

    // Menu recipes for the user's menus
    const menuIds = (menusResult.data || []).map(m => m.id)
    let menuRecipes = []
    if (menuIds.length) {
      const { data } = await supabase.from('menu_recipes').select('*').in('menu_id', menuIds)
      menuRecipes = data || []
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: uid,
      email: user.email,
      profile: profileResult.data || {},
      calendar_entries: calendarResult.data || [],
      food_journal: journalResult.data || [],
      weight_logs: weightResult.data || [],
      recipes_created: recipesResult.data || [],
      menus: menusResult.data || [],
      menu_recipes: menuRecipes,
      recipe_ingredient_swaps: swapsResult.data || [],
      recipe_member_states: memberStatesResult.data || [],
      daily_usage: usageResult.data || [],
      shopping_lists: listsResult.data || [],
      shopping_list_items: shoppingItems,
      nutritionist_notes_received: notesResult.data || [],
      family_memberships: familyResult.data || [],
      managed_members: managedResult.data || [],
      family_invites_sent: invitesResult.data || [],
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mintyfit-data-export-${uid.slice(0, 8)}.json"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
