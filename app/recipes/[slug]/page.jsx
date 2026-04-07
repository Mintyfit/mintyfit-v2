import { createPublicClient, createClient } from '@/lib/supabase/server'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'
import { notFound } from 'next/navigation'
import RecipeDetailClient from '@/components/recipes/RecipeDetailClient'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('recipes')
    .select('title, description, image_url')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .maybeSingle()

  if (!data) return { title: 'Recipe — MintyFit' }
  return {
    title: `${data.title} — MintyFit`,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      images: data.image_url ? [{ url: data.image_url }] : [],
    },
  }
}

async function getRecipeAndFamily(slug) {
  const supabase = createPublicClient()

  // Try slug first, then id
  let { data: row } = await supabase
    .from('recipes')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!row) {
    const { data: byId } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', slug)
      .maybeSingle()
    row = byId
  }

  if (!row) return { recipe: null, members: [] }

  // Get auth user for family members
  let members = []
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      // Get family members via family_memberships
      const { data: memberships } = await authClient
        .from('family_memberships')
        .select('family_id')
        .eq('profile_id', user.id)
        .limit(1)

      if (memberships?.length) {
        const familyId = memberships[0].family_id
        // Get linked members
        const { data: linked } = await authClient
          .from('family_memberships')
          .select('profile_id, profiles(id, display_name, first_name, weight, height, age, gender, goals)')
          .eq('family_id', familyId)

        // Get managed members
        const { data: managed } = await authClient
          .from('managed_members')
          .select('id, name, weight, height, age, gender, goals')
          .eq('family_id', familyId)

        members = [
          ...(linked || []).map(l => ({ ...l.profiles, type: 'linked' })),
          ...(managed || []).map(m => ({ ...m, display_name: m.name, type: 'managed' })),
        ].filter(Boolean)
      } else {
        // Just the current user
        const { data: profile } = await authClient
          .from('profiles')
          .select('id, display_name, first_name, weight, height, age, gender, goals')
          .eq('id', user.id)
          .maybeSingle()
        if (profile) members = [{ ...profile, type: 'linked' }]
      }
    }
  } catch {}

  return { recipe: normalizeRecipe(row), members }
}

export default async function RecipeDetailPage({ params }) {
  const { slug } = await params
  const { recipe, members } = await getRecipeAndFamily(slug)

  if (!recipe) notFound()

  // Recipe JSON-LD (TASK 4.6)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description,
    image: recipe.image ? [recipe.image] : [],
    recipeYield: `${recipe.base_servings} servings`,
    prepTime: recipe.prep_time ? `PT${recipe.prep_time}M` : undefined,
    cookTime: recipe.cook_time ? `PT${recipe.cook_time}M` : undefined,
    totalTime: (recipe.prep_time || recipe.cook_time) ? `PT${(recipe.prep_time || 0) + (recipe.cook_time || 0)}M` : undefined,
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
      <RecipeDetailClient recipe={recipe} members={members} />
    </>
  )
}
