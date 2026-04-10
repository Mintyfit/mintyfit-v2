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

  // Handle missing env vars gracefully
  let publicRecipes = []
  if (supabase) {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) console.error('Recipes query error:', error)
    publicRecipes = data || []
  }

  let privateRecipes = []
  if (userId) {
    try {
      const authClient = await createClient()
      const { data } = await authClient
        .from('recipes')
        .select('*')
        .eq('profile_id', userId)
        .eq('is_public', false)
        .order('created_at', { ascending: false })
        .limit(100)
      privateRecipes = data || []
    } catch {}
  }

  const all = [...publicRecipes, ...privateRecipes]
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
