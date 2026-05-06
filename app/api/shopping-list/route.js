import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractIngredientsFromRecipe, mergeItems, categorizeIngredient } from '@/lib/shopping/utils'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateList(supabase, userId) {
  // Try to fetch existing list
  const { data: existing } = await supabase
    .from('shopping_lists')
    .select('id, name')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing

  // Create a new one
  const { data: created, error } = await supabase
    .from('shopping_lists')
    .insert({ owner_id: userId, name: 'Shopping List' })
    .select('id, name')
    .single()

  if (error) throw new Error(error.message)
  return created
}

// ── GET /api/shopping-list ────────────────────────────────────────────────────
// Returns { list, items } — auto-creates list if none exists

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const list = await getOrCreateList(supabase, user.id)

    const { data: items, error: itemsErr } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', list.id)
      .order('created_at', { ascending: true })

    if (itemsErr) throw new Error(itemsErr.message)

    return NextResponse.json({ list, items: items || [] })
  } catch (err) {
    console.error('[shopping-list GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    dates.push(dd.toISOString().split('T')[0])
  }
  return dates
}

// ── POST /api/shopping-list ───────────────────────────────────────────────────
// Body options:
//   { recipe_id }                   — extract from a recipe
//   { items: [{ingredient_name, amount, unit, category}] }  — manual batch
//   { item: {ingredient_name, amount, unit, category} }     — single manual item
//   { action: 'refresh_from_plan', week_date? }             — regenerate from current week's planner

export async function POST(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const list = await getOrCreateList(supabase, user.id)

    // ── Refresh from plan ───────────────────────────────────────────────────
    if (body.action === 'refresh_from_plan') {
      const weekDates = getMondayOfWeek(body.week_date ? new Date(body.week_date) : new Date())

      // Fetch all calendar entries for the week
      const { data: entries } = await supabase
        .from('calendar_entries')
        .select('recipe_id')
        .eq('profile_id', user.id)
        .in('date_str', weekDates)

      const recipeIds = [...new Set((entries || []).map(e => e.recipe_id).filter(Boolean))]

      if (recipeIds.length === 0) {
        return NextResponse.json({ message: 'No recipes planned this week', added: 0 })
      }

      // Clear existing list items
      await supabase
        .from('shopping_list_items')
        .delete()
        .eq('list_id', list.id)

      // Fetch all recipes and extract ingredients
      const { data: recipes } = await supabase
        .from('recipes')
        .select('id, title, instructions')
        .in('id', recipeIds)

      const allNewItems = (recipes || []).flatMap(r => extractIngredientsFromRecipe(r))
      const { toInsert } = mergeItems([], allNewItems)

      if (toInsert.length > 0) {
        const rows = toInsert.map(item => ({
          list_id: list.id,
          ingredient_name: item.ingredient_name,
          amount: item.amount,
          unit: item.unit,
          category: item.category || 'other',
          added_by: user.id,
        }))
        const { error: insertErr } = await supabase
          .from('shopping_list_items')
          .insert(rows)
        if (insertErr) throw new Error(insertErr.message)
      }

      const { data: freshItems } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('list_id', list.id)
        .order('created_at', { ascending: true })

      return NextResponse.json({ list, items: freshItems || [], added: toInsert.length, refreshed: true })
    }

    // Fetch existing items for merge
    const { data: existingItems } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', list.id)

    let newItems = []

    if (body.recipe_id) {
      // If explicit ingredients provided (checked selection), use those
      // Otherwise extract all ingredients from the recipe
      const explicitIngredients = body.ingredients || body.items
      if (explicitIngredients?.length) {
        newItems = explicitIngredients.map(item => ({
          ingredient_name: item.ingredient_name || item.name,
          amount: item.amount || null,
          unit: item.unit || null,
          category: item.category || categorizeIngredient(item.ingredient_name || item.name),
          source_recipe_id: body.recipe_id,
        }))
      } else {
        // Extract all ingredients from the recipe
        const { data: recipe, error: recipeErr } = await supabase
          .from('recipes')
          .select('id, title, instructions')
          .eq('id', body.recipe_id)
          .single()

        if (recipeErr || !recipe) {
          return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
        }

        newItems = extractIngredientsFromRecipe(recipe)
      }
    } else if (body.items) {
      newItems = body.items.map(item => ({
        ingredient_name: item.ingredient_name,
        amount: item.amount || null,
        unit: item.unit || null,
        category: item.category || categorizeIngredient(item.ingredient_name),
        source_recipe_id: item.source_recipe_id || null,
      }))
    } else if (body.item) {
      newItems = [{
        ingredient_name: body.item.ingredient_name,
        amount: body.item.amount || null,
        unit: body.item.unit || null,
        category: body.item.category || categorizeIngredient(body.item.ingredient_name),
        source_recipe_id: body.item.source_recipe_id || null,
      }]
    } else {
      return NextResponse.json({ error: 'Provide recipe_id, items, or item' }, { status: 400 })
    }

    const { toInsert, toUpdate } = mergeItems(existingItems || [], newItems)

    // Insert new items
    if (toInsert.length > 0) {
      const rows = toInsert.map(item => ({
        list_id: list.id,
        ingredient_name: item.ingredient_name,
        amount: item.amount,
        unit: item.unit,
        category: item.category || 'other',
        source_recipe_id: item.source_recipe_id || null,
        added_by: user.id,
      }))

      const { error: insertErr } = await supabase
        .from('shopping_list_items')
        .insert(rows)

      if (insertErr) throw new Error(insertErr.message)
    }

    // Update existing items (amount merge)
    for (const upd of toUpdate) {
      await supabase
        .from('shopping_list_items')
        .update({ amount: upd.amount })
        .eq('id', upd.id)
    }

    // Return fresh item list
    const { data: updatedItems } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', list.id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      list,
      items: updatedItems || [],
      added: toInsert.length,
      merged: toUpdate.length,
    })
  } catch (err) {
    console.error('[shopping-list POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── PATCH /api/shopping-list ──────────────────────────────────────────────────
// Body: { item_id, checked }   — toggle a single item
// Body: { clear_checked: true } — remove all checked items

export async function PATCH(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const list = await getOrCreateList(supabase, user.id)

    if (body.clear_checked) {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('list_id', list.id)
        .eq('checked', true)

      if (error) throw new Error(error.message)
      return NextResponse.json({ cleared: true })
    }

    if (body.item_id == null || body.checked == null) {
      return NextResponse.json({ error: 'Provide item_id + checked, or clear_checked' }, { status: 400 })
    }

    const { data: item, error: updateErr } = await supabase
      .from('shopping_list_items')
      .update({ checked: body.checked })
      .eq('id', body.item_id)
      .eq('list_id', list.id)  // ownership guard
      .select()
      .single()

    if (updateErr) throw new Error(updateErr.message)

    return NextResponse.json({ item })
  } catch (err) {
    console.error('[shopping-list PATCH]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── DELETE /api/shopping-list ─────────────────────────────────────────────────
// Body: { item_id }        — remove a single item
// Body: { clear_all: true } — remove all items in the list

export async function DELETE(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const list = await getOrCreateList(supabase, user.id)

    if (body.clear_all) {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('list_id', list.id)

      if (error) throw new Error(error.message)
      return NextResponse.json({ cleared: true })
    }

    if (!body.item_id) {
      return NextResponse.json({ error: 'Provide item_id or clear_all' }, { status: 400 })
    }

    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', body.item_id)
      .eq('list_id', list.id)  // ownership guard

    if (error) throw new Error(error.message)

    return NextResponse.json({ deleted: body.item_id })
  } catch (err) {
    console.error('[shopping-list DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
