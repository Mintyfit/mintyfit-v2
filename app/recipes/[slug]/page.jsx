import { createPublicClient } from '@/lib/supabase/server'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'
import { notFound } from 'next/navigation'
import RecipeDetailClient from '@/components/recipes/RecipeDetailClient'

export const revalidate = 3600

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Single query reused by both generateMetadata and the page — no double round-trip
async function fetchRecipeRow(slug) {
  const supabase = createPublicClient()
  const filter = UUID_RE.test(slug)
    ? `slug.eq.${slug},id.eq.${slug}`
    : `slug.eq.${slug}`
  const { data } = await supabase
    .from('recipes')
    .select('*')
    .or(filter)
    .maybeSingle()
  return data || null
}


export async function generateMetadata({ params }) {
  const { slug } = await params
  const row = await fetchRecipeRow(slug)
  if (!row) return { title: 'Recipe — MintyFit' }
  return {
    title: `${row.title} — MintyFit`,
    description: row.description,
    openGraph: {
      title: row.title,
      description: row.description,
      images: row.image_url ? [{ url: row.image_url }] : [],
    },
  }
}

export default async function RecipeDetailPage({ params }) {
  const { slug } = await params
  const row = await fetchRecipeRow(slug)

  if (!row) notFound()

  const recipe = normalizeRecipe(row)

  // Family members are loaded client-side by RecipeDetailClient after auth —
  // keeps this route static so ISR cache works
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description,
    image: recipe.image ? [recipe.image] : [],
    recipeYield: `${recipe.base_servings} servings`,
    prepTime: recipe.prep_time ? `PT${recipe.prep_time}M` : undefined,
    cookTime: recipe.cook_time ? `PT${recipe.cook_time}M` : undefined,
    totalTime: (recipe.prep_time || recipe.cook_time)
      ? `PT${(recipe.prep_time || 0) + (recipe.cook_time || 0)}M`
      : undefined,
    recipeIngredient: recipe.steps
      ?.flatMap(s => s.ingredients || [])
      .map(i => `${i.amount ? `${i.amount} ${i.unit} ` : ''}${i.name}`) || [],
    recipeInstructions: recipe.steps?.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title || `Step ${i + 1}`,
      text: s.instruction,
    })) || [],
    nutrition: recipe.nutrition?.perServing ? {
      '@type': 'NutritionInformation',
      calories: `${Math.round(recipe.nutrition.perServing.energy_kcal || 0)} calories`,
      proteinContent: `${Math.round(recipe.nutrition.perServing.protein || 0)}g`,
      carbohydrateContent: `${Math.round(recipe.nutrition.perServing.carbs_total || 0)}g`,
      fatContent: `${Math.round(recipe.nutrition.perServing.fat_total || 0)}g`,
    } : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecipeDetailClient recipe={recipe} members={[]} />
    </>
  )
}
