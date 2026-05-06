import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getNutritionData } from '@/lib/nutrition/nutrition'

export const maxDuration = 120

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return new Response('Forbidden', { status: 403 })

  const { plan, menuName } = await request.json()
  const recipes = plan?.recipes || []

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      const adminSupabase = createAdminClient()

      // Create the menu first
      const { data: menu, error: menuErr } = await adminSupabase.from('menus').insert({
        name: menuName || plan.menuName || 'Imported Plan',
        created_by: user.id,
        is_public: false,
      }).select('id').single()

      if (menuErr) {
        send({ ok: false, name: 'Menu', error: menuErr.message })
        controller.close()
        return
      }

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i]
        try {
          // Compute nutrition via USDA lookup
          const nutrition = await getNutritionData(recipe.ingredients || [])

          const { data: savedRecipe, error: recipeErr } = await adminSupabase.from('recipes').insert({
            name: recipe.name,
            description: recipe.description || '',
            meal_type: recipe.meal_type || 'lunch',
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            created_by: user.id,
            is_public: false,
            ...nutrition,
          }).select('id').single()

          if (recipeErr) throw new Error(recipeErr.message)

          // Link to menu
          await adminSupabase.from('menu_recipes').insert({
            menu_id: menu.id,
            recipe_id: savedRecipe.id,
            day_of_week: (i % 7) + 1,
            meal_type: recipe.meal_type || 'lunch',
          })

          send({ ok: true, name: recipe.name })
        } catch (e) {
          send({ ok: false, name: recipe.name, error: e.message })
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
