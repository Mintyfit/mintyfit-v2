import { createPublicClient } from '@/lib/supabase/server'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'
import RecipesClient from '@/components/recipes/RecipesClient'

export const metadata = {
  title: 'Recipes — MintyFit',
  description: 'Browse family-friendly recipes with personalized nutrition for every member. AI-generated or hand-picked.',
}

export const revalidate = 3600

const LIST_COLUMNS = 'id,slug,title,description,image_url,image_thumb_url,meal_type,food_type,cuisine_type,glycemic_load,price_level,calorie_range,cooking_technique,prep_time_minutes,cook_time_minutes,is_public,profile_id,created_at,updated_at,nutrition'

async function getPublicRecipes() {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('recipes')
    .select(LIST_COLUMNS)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) console.error('Recipes fetch error:', error)
  return (data || []).map(normalizeRecipe).filter(Boolean)
}

export default async function RecipesPage() {
  const recipes = await getPublicRecipes()
  return <RecipesClient initialRecipes={recipes} />
}
