import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipe_id, title, description, meal_type, servings, prep_time_minutes, cook_time_minutes, steps } = await request.json()

    if (!recipe_id) {
      return NextResponse.json({ error: 'Missing recipe_id' }, { status: 400 })
    }

    // Verify ownership
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

    const updates = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (meal_type !== undefined) updates.meal_type = meal_type
    if (servings !== undefined) updates.servings = Number(servings)
    if (prep_time_minutes !== undefined) updates.prep_time_minutes = Number(prep_time_minutes)
    if (cook_time_minutes !== undefined) updates.cook_time_minutes = Number(cook_time_minutes)
    if (steps !== undefined) {
      // Fetch current instructions to preserve non-steps fields
      const { data: full } = await supabase.from('recipes').select('instructions').eq('id', recipe_id).maybeSingle()
      const current = full?.instructions || {}
      updates.instructions = Array.isArray(current)
        ? steps
        : { ...current, steps }
    }

    const { error: updateError } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', recipe_id)

    if (updateError) {
      console.error('Recipe update error:', updateError)
      return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Recipe update route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
