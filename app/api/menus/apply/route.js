import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// ── POST /api/menus/apply ─────────────────────────────────────────────────────
// Body: { menu_id: string, start_date: 'YYYY-MM-DD' }
//
// Copies all recipes from a menu into the user's calendar_entries, starting
// from start_date. Recipes within each meal_type are distributed day by day
// using sort_order as the day index.

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { menu_id, start_date } = body

    if (!menu_id || !start_date) {
      return NextResponse.json({ error: 'menu_id and start_date are required' }, { status: 400 })
    }

    // Validate date
    const startDateObj = new Date(start_date)
    if (isNaN(startDateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid start_date' }, { status: 400 })
    }

    // Fetch menu with its recipe assignments
    const { data: menu, error: menuErr } = await supabase
      .from('menus')
      .select(`
        id, name, is_public, profile_id,
        menu_recipes (
          id, meal_type, sort_order,
          recipes ( id, title )
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
          date_str: dateStr,
          meal_type: mealType,
          recipe_id: mrs[i].recipes.id,
        })
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ message: 'No valid recipes to add', added: 0 })
    }

    const { error: insertErr } = await supabase
      .from('calendar_entries')
      .insert(rows)

    if (insertErr) throw new Error(insertErr.message)

    return NextResponse.json({ added: rows.length, start_date })
  } catch (err) {
    console.error('[menus/apply POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
