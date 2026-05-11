import { createPublicClient } from '@/lib/supabase/server'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'
import { notFound, permanentRedirect } from 'next/navigation'
import RecipeDetailClient from '@/components/recipes/RecipeDetailClient'

export const revalidate = 3600

const UUID_RE       = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Legacy URLs like "butter-chicken-...-f11a6e" — trailing -<4..12 hex>
const HEX_SUFFIX_RE = /-([0-9a-f]{4,12})$/i

// Resolve a recipe by slug, with graceful fallbacks for legacy URLs.
// Returns { row, canonicalSlug } where canonicalSlug !== requested slug if
// we matched via a fallback and the caller should redirect to clean it up.
async function fetchRecipeRow(slug) {
  const supabase = createPublicClient()

  // 1) Exact match on slug (or id if the input is a UUID).
  const exactFilter = UUID_RE.test(slug)
    ? `slug.eq.${slug},id.eq.${slug}`
    : `slug.eq.${slug}`
  const { data: exact } = await supabase
    .from('recipes')
    .select('*')
    .or(exactFilter)
    .maybeSingle()
  if (exact) return { row: exact, canonicalSlug: exact.slug || slug }

  // 2) Legacy fallback: strip trailing -<hex> and try the clean prefix.
  const m = slug.match(HEX_SUFFIX_RE)
  if (m) {
    const cleanSlug = slug.slice(0, -m[0].length)
    if (cleanSlug) {
      const { data: byClean } = await supabase
        .from('recipes')
        .select('*')
        .eq('slug', cleanSlug)
        .maybeSingle()
      if (byClean) return { row: byClean, canonicalSlug: byClean.slug }

      // 3) Last resort: the hex tail might be the first chars of the recipe id.
      const idPrefix = m[1].toLowerCase()
      const { data: byIdPrefix } = await supabase
        .from('recipes')
        .select('*')
        .ilike('id', `${idPrefix}%`)
        .limit(1)
        .maybeSingle()
      if (byIdPrefix) {
        return { row: byIdPrefix, canonicalSlug: byIdPrefix.slug || byIdPrefix.id }
      }
    }
  }

  return { row: null, canonicalSlug: null }
}


export async function generateMetadata({ params }) {
  const { slug } = await params
  const { row } = await fetchRecipeRow(slug)
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
  const { row, canonicalSlug } = await fetchRecipeRow(slug)

  if (!row) notFound()

  // If we matched via legacy fallback, redirect to the clean URL.
  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(`/recipes/${canonicalSlug}`)
  }

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
