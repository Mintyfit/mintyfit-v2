import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Delete a recipe and all references to it.
 *
 * Tables with ON DELETE CASCADE (cleaned up automatically by the FK):
 *   - calendar_entries        (migration 030)
 *   - recipe_ingredient_swaps (migration 039)
 *   - shopping_list_items     (migration 026)
 *
 * Tables WITHOUT cascade — we delete them explicitly first:
 *   - recipe_favourites
 *   - recipe_interactions
 *   - recipe_member_states
 *
 * Best-effort: if any of those tables don't exist or contain no rows, we
 * swallow the error and move on. The final recipes delete is the one
 * that must succeed.
 */
export async function POST(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipe_id } = await request.json()
    if (!recipe_id) {
      return NextResponse.json({ error: 'Missing recipe_id' }, { status: 400 })
    }

    // Verify ownership before doing anything destructive.
    const { data: existing, error: fetchError } = await supabase
      .from('recipes')
      .select('id, profile_id')
      .eq('id', recipe_id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    if (existing.profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Best-effort cleanup of non-cascading child tables.
    const childTables = ['recipe_favourites', 'recipe_interactions', 'recipe_member_states']
    for (const table of childTables) {
      const { error } = await supabase.from(table).delete().eq('recipe_id', recipe_id)
      if (error && error.code !== '42P01' /* relation does not exist */) {
        console.warn(`[recipe delete] cleanup of ${table} failed:`, error.message)
      }
    }

    // Final delete — cascades take care of calendar_entries, swaps, shopping_list_items.
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipe_id)

    if (deleteError) {
      console.error('Recipe delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Recipe delete route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
