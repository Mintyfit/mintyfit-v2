import { createPublicClient, createClient } from '@/lib/supabase/server'
import { notFound, permanentRedirect } from 'next/navigation'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'
import MenuDetailClient from '@/components/menus/MenuDetailClient'

export const revalidate = 60

// Legacy "name-ef0dc3" URLs: strip a trailing -<4..12 hex> if no exact match.
const HEX_SUFFIX_RE = /-([0-9a-f]{4,12})$/i

export async function generateMetadata({ params }) {
  const { slug } = await params
  const menu = await getMenu(slug)
  if (!menu) return { title: 'Menu not found — MintyFit' }
  return {
    title: `${menu.name} — MintyFit Meal Plans`,
    description: menu.description || `A curated meal plan with ${menu.recipes?.length || 0} recipes.`,
    openGraph: { images: menu.image_url ? [{ url: menu.image_url }] : [] },
  }
}

async function getMenu(slug) {
  try {
    const supabase = createPublicClient()
    const authClient = await createClient()

    const selectFields = `*, menu_recipes (id, meal_type, sort_order, recipes (*))`

    async function fetchOne(value, column = 'slug') {
      const { data: pub } = await supabase
        .from('menus')
        .select(selectFields)
        .eq(column, value)
        .eq('is_public', true)
        .maybeSingle()
      if (pub) return pub
      // Authenticated user's private menus
      const { data: { user } } = await authClient.auth.getUser()
      if (user) {
        const { data: own } = await authClient
          .from('menus')
          .select(selectFields)
          .eq(column, value)
          .eq('profile_id', user.id)
          .maybeSingle()
        if (own) return own
      }
      return null
    }

    // 1) Exact slug match
    let data = await fetchOne(slug, 'slug')

    // 2) Try by id (if input looks like a UUID)
    if (!data && /^[0-9a-f-]{36}$/i.test(slug)) {
      data = await fetchOne(slug, 'id')
    }

    // 3) Legacy fallback: strip trailing -<hex> and try the clean prefix.
    let canonicalSlug = data?.slug || null
    if (!data) {
      const m = slug.match(HEX_SUFFIX_RE)
      if (m) {
        const cleanSlug = slug.slice(0, -m[0].length)
        if (cleanSlug) {
          data = await fetchOne(cleanSlug, 'slug')
          if (data) canonicalSlug = data.slug
        }
      }
    }

    if (!data) return null

    const normalizedRecipes = (data.menu_recipes || [])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(mr => ({ ...mr, recipe: normalizeRecipe(mr.recipes) }))
      .filter(mr => mr.recipe)

    return { ...data, normalizedRecipes, _canonicalSlug: canonicalSlug || data.slug }
  } catch {
    return null
  }
}

export default async function MenuDetailPage({ params }) {
  const { slug } = await params
  const menu = await getMenu(slug)
  if (!menu) notFound()

  // Redirect legacy URLs (e.g. -mediterranean-meal-plan-ef0dc3) to clean slug
  if (menu._canonicalSlug && menu._canonicalSlug !== slug) {
    permanentRedirect(`/menus/${menu._canonicalSlug}`)
  }

  const authClient = await createClient()
  let userId = null
  try {
    const { data: { user } } = await authClient.auth.getUser()
    userId = user?.id || null
  } catch {}

  return <MenuDetailClient menu={menu} userId={userId} />
}
