import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slugify, uniqueSlug } from '@/lib/utils/slugify'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipe_id, steps } = await request.json()
    if (!recipe_id || !steps) {
      return NextResponse.json({ error: 'Missing recipe_id or steps' }, { status: 400 })
    }

    // Fetch the original recipe
    const { data: original, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipe_id)
      .single()

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Generate a clean unique slug for the forked recipe
    const forkedTitle = `${original.title} (My Version)`
    const baseSlug = slugify(forkedTitle)
    const newSlug = await uniqueSlug(baseSlug, async (candidate) => {
      const { data } = await supabase.from('recipes').select('id').eq('slug', candidate).maybeSingle()
      return !!data
    })

    // Build the forked recipe — copy original fields, override steps and ownership
    const forkedRecipe = {
      title:          `${original.title} (My Version)`,
      slug:           newSlug,
      description:    original.description,
      image:          original.image,
      meal_type:      original.meal_type,
      cuisine_type:   original.cuisine_type,
      food_type:      original.food_type,
      base_servings:  original.base_servings,
      prep_time:      original.prep_time,
      cook_time:      original.cook_time,
      glycemic_load:  original.glycemic_load,
      instructions:   original.instructions
        ? { ...original.instructions, steps }
        : { steps },
      nutrition:      original.nutrition,
      tags:           original.tags,
      is_public:      false,
      created_by:     user.id,
    }

    const { data: inserted, error: insertError } = await supabase
      .from('recipes')
      .insert(forkedRecipe)
      .select('id, slug')
      .single()

    if (insertError) {
      console.error('Fork insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 })
    }

    return NextResponse.json({ id: inserted.id, slug: inserted.slug })
  } catch (err) {
    console.error('Fork route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
