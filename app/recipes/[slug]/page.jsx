import { createClient, createPublicClient } from '@/lib/supabase/server'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import RecipeDetailClient from '@/components/recipes/RecipeDetailClient'

// Auth-aware in the fallback path: a private recipe must only be visible to its
// owner / family, so the route as a whole cannot be statically cached per-URL.
// Public recipes (the vast majority of traffic) are served from the Vercel Data
// Cache via unstable_cache below — no Supabase round trip on repeat views.
// Family members hydrate client-side in RecipeDetailClient (useCachedData).
export const dynamic = 'force-dynamic'

const UUID_RE       = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Legacy URLs like "butter-chicken-...-f11a6e" — trailing -<4..12 hex>
const HEX_SUFFIX_RE = /-([0-9a-f]{4,12})$/i
// Collision URLs like "butter-chicken-...-2" — trailing -<digits>. Used as
// a fallback when the numbered duplicate has been deleted but the bare
// slug still exists (e.g. after deduping recipes).
const NUM_SUFFIX_RE = /-\d+$/

// ── Public fast path ─────────────────────────────────────────────────────────
// Exact-slug lookup of PUBLIC recipes, cached in the Vercel Data Cache.
// Anonymous-safe by construction: the query filters is_public=true, so private
// rows never enter the shared cache. Invalidated via revalidateTag('recipes')
// from every recipe mutation route; 5-min revalidate as a safety net.
const getCachedPublicRecipe = unstable_cache(
  async (slug) => {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('slug', slug)
      .eq('is_public', true)
      .maybeSingle()
    return data || null
  },
  ['recipe-public-by-slug'],
  { tags: ['recipes'], revalidate: 300 }
)

// Resolve a recipe by slug, with graceful fallbacks for legacy URLs.
// Returns { row, canonicalSlug } where canonicalSlug !== requested slug if
// we matched via a fallback and the caller should redirect to clean it up.
async function fetchRecipeRowAuth(slug) {
  // Use the cookie-aware server client so RLS lets owners see their own
  // private recipes (is_public=false). Anonymous visitors still get only
  // public rows via the same RLS policy.
  const supabase = await createClient()

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

  // 4) Numeric collision fallback: "-2", "-3", ... If the numbered duplicate
  //    has been deleted, fall back to the bare slug so old links still work.
  const numMatch = slug.match(NUM_SUFFIX_RE)
  if (numMatch) {
    const bareSlug = slug.slice(0, -numMatch[0].length)
    if (bareSlug) {
      const { data: byBare } = await supabase
        .from('recipes')
        .select('*')
        .eq('slug', bareSlug)
        .maybeSingle()
      if (byBare) return { row: byBare, canonicalSlug: byBare.slug }
    }
  }

  return { row: null, canonicalSlug: null }
}

// React cache(): generateMetadata and the page component share ONE resolution
// per request (previously the full query chain ran twice). Public recipes
// resolve from the data cache without touching Supabase at all.
const getRecipe = cache(async (slug) => {
  // Fast path: public recipe, exact slug — served from Vercel Data Cache.
  if (!UUID_RE.test(slug)) {
    const pub = await getCachedPublicRecipe(slug)
    if (pub) return { row: pub, canonicalSlug: pub.slug || slug }
  }
  // Slow path: private recipes (owner/family via RLS) and legacy slug fallbacks.
  return fetchRecipeRowAuth(slug)
})

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { row } = await getRecipe(slug)
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
  const { row, canonicalSlug } = await getRecipe(slug)

  if (!row) notFound()

  // If we matched via legacy fallback, redirect to the clean URL.
  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(`/recipes/${canonicalSlug}`)
  }

  const recipe = normalizeRecipe(row)

  // Family members are NOT loaded server-side: the client hydrates them from
  // a localStorage SWR cache (RecipeDetailClient), so logged-in users get the
  // recipe content immediately instead of waiting on a serial family/weight
  // query chain. (RLS scopes weight_logs to own rows in both contexts anyway,
  // so server-side loading had no data advantage.)
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
      <RecipeDetailClient recipe={recipe} members={[]} familyId={null} />
    </>
  )
}
