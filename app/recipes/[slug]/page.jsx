import { createClient } from '@/lib/supabase/server'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'
import { notFound, permanentRedirect } from 'next/navigation'
import { enrichMember } from '@/lib/member/enrichMember'
import RecipeDetailClient from '@/components/recipes/RecipeDetailClient'

// Auth-aware: a private recipe must only be visible to its owner / family.
// ISR would cache per-URL across users, leaking private rows — so we render
// dynamically instead. Public recipes are still cheap (single indexed lookup).
export const dynamic = 'force-dynamic'

const UUID_RE       = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Legacy URLs like "butter-chicken-...-f11a6e" — trailing -<4..12 hex>
const HEX_SUFFIX_RE = /-([0-9a-f]{4,12})$/i
// Collision URLs like "butter-chicken-...-2" — trailing -<digits>. Used as
// a fallback when the numbered duplicate has been deleted but the bare
// slug still exists (e.g. after deduping recipes).
const NUM_SUFFIX_RE = /-\d+$/

// Resolve a recipe by slug, with graceful fallbacks for legacy URLs.
// Returns { row, canonicalSlug } where canonicalSlug !== requested slug if
// we matched via a fallback and the caller should redirect to clean it up.
async function fetchRecipeRow(slug) {
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

async function loadFamilyMembers(supabase, userId) {
  try {
    const { data: memberships } = await supabase
      .from('family_memberships')
      .select('family_id')
      .eq('profile_id', userId)
      .limit(1)

    if (!memberships?.length) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, first_name, weight, height, age, gender, goals')
        .eq('id', userId)
        .maybeSingle()
      if (!profile) return { members: [], familyId: null }
      const { data: logs } = await supabase
        .from('weight_logs')
        .select('weight')
        .eq('profile_id', userId)
        .order('logged_date', { ascending: false })
        .limit(1)
      profile.weight = profile.weight ?? logs?.[0]?.weight ?? null
      return { members: [enrichMember({ ...profile, type: 'linked' })], familyId: null }
    }

    const familyId = memberships[0].family_id
    const [{ data: linked }, { data: managed }] = await Promise.all([
      supabase
        .from('family_memberships')
        .select('profile_id, profiles(id, full_name, display_name, first_name, weight, height, age, gender, goals)')
        .eq('family_id', familyId),
      supabase
        .from('managed_members')
        .select('id, name, date_of_birth, weight, height, gender')
        .eq('family_id', familyId),
    ])

    const linkedProfileIds = (linked || []).map(l => l.profile_id).filter(Boolean)
    let weightByProfile = new Map()
    if (linkedProfileIds.length > 0) {
      const { data: logs } = await supabase
        .from('weight_logs')
        .select('profile_id, weight')
        .in('profile_id', linkedProfileIds)
        .order('logged_date', { ascending: false })
      if (logs) {
        for (const log of logs) {
          if (!weightByProfile.has(log.profile_id)) {
            weightByProfile.set(log.profile_id, log.weight)
          }
        }
      }
    }

    const members = [
      ...(linked || []).map(l => enrichMember({
        ...l.profiles,
        type: 'linked',
        weight: l.profiles?.weight ?? weightByProfile.get(l.profile_id) ?? null,
      })),
      ...(managed || []).map(m => enrichMember({
        ...m,
        display_name: m.name,
        type: 'managed',
        weight: m.weight ?? null,
        height: m.height ?? null,
      })),
    ].filter(Boolean)

    return { members, familyId }
  } catch {
    return { members: [], familyId: null }
  }
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
  const supabase = await createClient()
  const { row, canonicalSlug } = await fetchRecipeRow(slug)

  if (!row) notFound()

  // If we matched via legacy fallback, redirect to the clean URL.
  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(`/recipes/${canonicalSlug}`)
  }

  const recipe = normalizeRecipe(row)

  // Load family members server-side so weight_logs queries bypass RLS —
  // client-side direct queries are scoped to auth.uid() only.
  let members = []
  let familyId = null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const result = await loadFamilyMembers(supabase, user.id)
      members = result.members
      familyId = result.familyId
    }
  } catch { /* pass empty members on error */ }
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
      <RecipeDetailClient recipe={recipe} members={members} familyId={familyId} />
    </>
  )
}
