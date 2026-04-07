import { createPublicClient, createClient } from '@/lib/supabase/server'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'
import RecipesClient from '@/components/recipes/RecipesClient'

export const metadata = {
  title: 'Recipes — MintyFit',
  description: 'Browse family-friendly recipes with personalized nutrition for every member. AI-generated or hand-picked.',
}

export const revalidate = 60

async function getRecipes(userId) {
  const supabase = createPublicClient()

  let query = supabase
    .from('recipes')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: publicRecipes, error } = await query

  let privateRecipes = []
  if (userId) {
    const authClient = await createClient()
    const { data } = await authClient
      .from('recipes')
      .select('*')
      .eq('profile_id', userId)
      .eq('is_public', false)
      .order('created_at', { ascending: false })
      .limit(100)
    privateRecipes = data || []
  }

  const all = [...(publicRecipes || []), ...privateRecipes]
  return all.map(normalizeRecipe).filter(Boolean)
}

export default async function RecipesPage() {
  // Try to get authenticated user
  let userId = null
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    userId = user?.id || null
  } catch {}

  const recipes = await getRecipes(userId)

  return <RecipesClient initialRecipes={recipes} />
}
