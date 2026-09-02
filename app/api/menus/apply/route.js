import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── POST /api/menus/apply ─────────────────────────────────────────────────────
// Body: { menu_id: string, start_date: 'YYYY-MM-DD' }
//
// Copies all recipes from a menu into the user's calendar_entries, starting
// from start_date. Recipes within each meal_type are distributed day by day
// using sort_order as the day index.

export async function POST(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { menu_id, start_date, consumer_member_ids } = body

    if (!menu_id || !start_date) {
      return NextResponse.json({ error: 'menu_id and start_date are required' }, { status: 400 })
    }

    // Validate date
    const startDateObj = new Date(start_date)
    if (isNaN(startDateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid start_date' }, { status: 400 })
    }

    const { data: memberships } = await supabase
      .from('family_memberships')
      .select('family_id')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .limit(1)
    const familyId = memberships?.[0]?.family_id || null

    let allowedConsumerIds = [user.id]
    if (familyId) {
      const [{ data: linked }, { data: managed }] = await Promise.all([
        supabase
          .from('family_memberships')
          .select('profile_id')
          .eq('family_id', familyId)
          .eq('status', 'active'),
        supabase
          .from('managed_members')
          .select('id')
          .eq('family_id', familyId),
      ])
      allowedConsumerIds = [
        ...(linked || []).map(m => m.profile_id),
        ...(managed || []).map(m => m.id),
      ].filter(Boolean)
    }

    const requestedConsumers = Array.isArray(consumer_member_ids) ? consumer_member_ids : []
    const requestedSet = new Set(requestedConsumers)
    const selectedConsumerIds = requestedConsumers.length
      ? allowedConsumerIds.filter(id => requestedSet.has(id))
      : allowedConsumerIds
    const finalConsumerIds = selectedConsumerIds.length ? selectedConsumerIds : allowedConsumerIds

    // Fetch menu with its recipe assignments
    const { data: menu, error: menuErr } = await supabase
      .from('menus')
      .select(`
        id, name, is_public, profile_id,
        menu_recipes (
          id, meal_type, sort_order,
          recipes ( id, title, nutrition )
        )
      `)
      .eq('id', menu_id)
      .single()

    if (menuErr || !menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
    }

    // Access check: public menus or the user's own private menu
    if (!menu.is_public && menu.profile_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!menu.menu_recipes?.length) {
      return NextResponse.json({ message: 'No recipes in this menu', added: 0 })
    }

    // Group by meal_type; within each group sort by sort_order to determine day
    const byMealType = {}
    for (const mr of menu.menu_recipes) {
      if (!mr.recipes?.id) continue
      const mt = mr.meal_type || 'dinner'
      if (!byMealType[mt]) byMealType[mt] = []
      byMealType[mt].push(mr)
    }
    for (const mt of Object.keys(byMealType)) {
      byMealType[mt].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }

    // Build rows: recipe index within its meal_type group = day offset from start_date
    const rows = []
    for (const [mealType, mrs] of Object.entries(byMealType)) {
      for (let i = 0; i < mrs.length; i++) {
        const d = new Date(start_date)
        d.setDate(d.getDate() + i)
        const dateStr = d.toISOString().split('T')[0]
        rows.push({
          profile_id: user.id,
          family_id: familyId,
          date_str: dateStr,
          meal_type: mealType,
          recipe_id: mrs[i].recipes.id,
          recipe_name: mrs[i].recipes.title || '',
          member_id: null,
          consumer_member_ids: finalConsumerIds,
          personal_nutrition: mrs[i].recipes.nutrition?.totals || mrs[i].recipes.nutrition?.perServing || null,
          origin: 'planned',
        })
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ message: 'No valid recipes to add', added: 0 })
    }

    // The unique index on (family_id, date_str, meal_type, recipe_id, origin) is
    // PARTIAL (migration 049, WHERE family_id IS NOT NULL), so PostgREST upsert
    // cannot use it as an arbiter (Postgres 42P10). Split into update/insert.
    let existingQuery = supabase
      .from('calendar_entries')
      .select('id, date_str, meal_type, recipe_id')
      .eq('origin', 'planned')
      .in('date_str', Array.from(new Set(rows.map(r => r.date_str))))
      .in('recipe_id', Array.from(new Set(rows.map(r => r.recipe_id))))
    existingQuery = familyId
      ? existingQuery.eq('family_id', familyId)
      : existingQuery.eq('profile_id', user.id).is('family_id', null)

    const { data: existingRows, error: findErr } = await existingQuery
    if (findErr) throw new Error(findErr.message)

    const existingByKey = new Map(
      (existingRows || []).map(r => [`${r.date_str}|${r.meal_type}|${r.recipe_id}`, r.id])
    )
    const toInsert = []
    const toUpdate = []
    for (const row of rows) {
      const existingId = existingByKey.get(`${row.date_str}|${row.meal_type}|${row.recipe_id}`)
      if (existingId) toUpdate.push({ id: existingId, row })
      else toInsert.push(row)
    }

    if (toInsert.length) {
      const { error } = await supabase.from('calendar_entries').insert(toInsert)
      if (error) throw new Error(error.message)
    }
    for (const { id, row } of toUpdate) {
      const { error } = await supabase
        .from('calendar_entries')
        .update({
          recipe_name: row.recipe_name,
          consumer_member_ids: row.consumer_member_ids,
          personal_nutrition: row.personal_nutrition,
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({
      added: rows.length,
      start_date,
      date_keys: Array.from(new Set(rows.map(row => row.date_str))),
    })
  } catch (err) {
    console.error('[menus/apply POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
