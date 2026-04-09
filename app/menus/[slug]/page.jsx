import { createPublicClient, createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'
import MenuDetailClient from '@/components/menus/MenuDetailClient'

export const revalidate = 60

export async function generateMetadata({ params }) {
  const menu = await getMenu(params.slug)
  if (!menu) return { title: 'Menu not found — MintyFit' }
  return {
    title: `${menu.name} — MintyFit Meal Plans`,
    description: menu.description || `A curated meal plan with ${menu.recipes?.length || 0} recipes.`,
    openGraph: { images: menu.image_url ? [{ url: menu.image_url }] : [] },
  }
}

async function getMenu(slug) {
  try {
    const cookieStore = cookies()
    const supabase = createPublicClient()
    const authClient = createClient(cookieStore)

    // Try slug first, then id fallback
    let query = supabase
      .from('menus')
      .select(`
        *,
        menu_recipes (
          id, meal_type, sort_order,
          recipes (*)
        )
      `)
      .or(`is_public.eq.true`)

    let { data } = await query.eq('slug', slug).single()
    if (!data) {
      // Try by id
      const { data: byId } = await query.eq('id', slug).single()
      data = byId
    }
    if (!data) {
      // Try user's own private menus
      const { data: { user } } = await authClient.auth.getUser()
      if (user) {
        const { data: own } = await authClient
          .from('menus')
          .select(`*, menu_recipes(id, meal_type, sort_order, recipes(*))`)
          .eq('profile_id', user.id)
          .or(`slug.eq.${slug},id.eq.${slug}`)
          .single()
        data = own
      }
    }
    if (!data) return null

    // Normalize recipes within menu_recipes
    const normalizedRecipes = (data.menu_recipes || [])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(mr => ({
        ...mr,
        recipe: normalizeRecipe(mr.recipes),
      }))
      .filter(mr => mr.recipe)

    return { ...data, normalizedRecipes }
  } catch {
    return null
  }
}

export default async function MenuDetailPage({ params }) {
  const menu = await getMenu(params.slug)
  if (!menu) notFound()

  const cookieStore = cookies()
  const authClient = createClient(cookieStore)
  let userId = null
  try {
    const { data: { user } } = await authClient.auth.getUser()
    userId = user?.id || null
  } catch {}

  return <MenuDetailClient menu={menu} userId={userId} />
}
