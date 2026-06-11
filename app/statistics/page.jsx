import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'
import StatisticsClient from '@/components/statistics/StatisticsClient'
import ClientViewBanner from '@/components/nutritionist/ClientViewBanner'

const HISTORY_DAYS = 60

export const metadata = {
  title: 'Nutrition Statistics - MintyFit',
  description: 'Family nutrition analytics with date range, member filters, and nutrient breakdown.',
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function normalizeName(row) {
  return row?.display_name || row?.full_name || row?.name || 'Member'
}

async function getStatisticsData(effectiveUserId, supabase) {
  try {
    const today = new Date()
    const historyFrom = new Date(today)
    historyFrom.setDate(today.getDate() - HISTORY_DAYS)
    const fromKey = toDateKey(historyFrom)

    const [meResult, membershipsResult, calendarResult, journalResult, recipesResult, weightLogsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, full_name, name, role, gender, date_of_birth, weight, weight_kg, height, height_cm, subscription_tier')
        .eq('id', effectiveUserId)
        .maybeSingle(),
      supabase
        .from('family_memberships')
        .select('family_id, role, status')
        .eq('profile_id', effectiveUserId)
        .eq('status', 'active')
        .limit(1),
      supabase
        .from('calendar_entries')
        .select(`
          id, date_str, meal_type, member_id, personal_nutrition,
          recipe_id, recipe_name,
          recipes(id, title, slug, image_url, image_thumb_url, nutrition, servings)
        `)
        .eq('profile_id', effectiveUserId)
        .gte('date_str', fromKey)
        .order('date_str', { ascending: false }),
      supabase
        .from('food_journal')
        .select('id, logged_date, meal_type, member_id, food_name, amount, unit, nutrition')
        .eq('profile_id', effectiveUserId)
        .gte('logged_date', fromKey)
        .order('logged_date', { ascending: false }),
      supabase
        .from('recipes')
        .select('id, title, slug, image_url, image_thumb_url, nutrition, meal_type')
        .or(`is_public.eq.true,profile_id.eq.${effectiveUserId}`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('weight_logs')
        .select('*')
        .eq('profile_id', effectiveUserId)
        .order('logged_date', { ascending: false })
        .limit(60),
    ])

    const me = meResult?.data
    const memberships = membershipsResult?.data

    let linkedMembers = []
    let managedMembers = []

    if (memberships?.length) {
      const familyId = memberships[0].family_id

      const [linkedResult, managedResult] = await Promise.all([
        supabase
          .from('family_memberships')
          .select('profile_id, role, status, profiles(id, display_name, full_name, name, gender, date_of_birth, weight, weight_kg, height, height_cm)')
          .eq('family_id', familyId)
          .eq('status', 'active'),
        supabase
          .from('managed_members')
          .select('id, name, gender, date_of_birth, weight_kg, height_cm')
          .eq('family_id', familyId),
      ])

      linkedMembers = (linkedResult?.data || [])
        .filter(r => r?.profiles?.id)
        .map(r => ({
          id: r.profiles.id,
          name: normalizeName(r.profiles),
          type: 'linked',
          role: r.role,
          gender: r.profiles.gender,
          date_of_birth: r.profiles.date_of_birth,
          weight: r.profiles.weight ?? r.profiles.weight_kg ?? null,
          height: r.profiles.height ?? r.profiles.height_cm ?? null,
        }))

      managedMembers = (managedResult?.data || []).map(m => ({
        id: m.id,
        name: m.name || 'Child',
        type: 'managed',
        role: 'managed',
        gender: m.gender,
        date_of_birth: m.date_of_birth,
        weight: m.weight_kg ?? null,
        height: m.height_cm ?? null,
      }))
    }

    const membersById = new Map()

    if (me?.id) {
      membersById.set(me.id, {
        id: me.id,
        name: normalizeName(me),
        type: 'linked',
        role: 'self',
        gender: me.gender,
        date_of_birth: me.date_of_birth,
        weight: me.weight ?? me.weight_kg ?? null,
        height: me.height ?? me.height_cm ?? null,
      })
    }

    for (const m of linkedMembers) membersById.set(m.id, m)
    for (const m of managedMembers) membersById.set(m.id, m)

    const members = Array.from(membersById.values())

    return {
      members,
      calendarEntries: calendarResult?.data || [],
      journalEntries: journalResult?.data || [],
      weightLogs: weightLogsResult?.data || [],
      allRecipes: recipesResult?.data || [],
    }
  } catch (error) {
    console.error('Statistics data error:', error)
    return {
      members: [],
      calendarEntries: [],
      journalEntries: [],
      weightLogs: [],
    }
  }
}

export default async function StatisticsPage({ searchParams }) {
  let supabase
  try {
    supabase = await createClient()
  } catch {
    redirect('/?auth=login')
  }

  let user
  try {
    const authData = await supabase.auth.getUser()
    user = authData.data?.user
  } catch {
    user = null
  }

  if (!user) redirect('/?auth=login')

  const resolved = await searchParams
  const clientId = resolved?.clientId
  let viewingClient = false
  let clientName = null

  if (clientId) {
    const { data: link } = await supabase
      .from('nutritionist_client_links')
      .select('id, status')
      .eq('nutritionist_id', user.id)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle()

    if (!link) {
      return redirect('/statistics')
    }

    viewingClient = true
    const adminClient = createAdminClient()
    const { data: cp } = await adminClient
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', clientId)
      .maybeSingle()
    clientName = cp?.display_name || cp?.full_name || 'client'

    const initialData = await getStatisticsData(clientId, supabase)
    return (
      <ClientViewBanner clientName={clientName} pageLabel="statistics" backHref="/statistics">
        <StatisticsClient
          userId={clientId}
          initialData={initialData}
          nutritionFields={NUTRITION_FIELDS}
          allRecipes={initialData.allRecipes}
          viewingClient={true}
          clientName={clientName}
        />
      </ClientViewBanner>
    )
  }

  const initialData = await getStatisticsData(user.id, supabase)

  return (
    <StatisticsClient
      userId={user.id}
      initialData={initialData}
      nutritionFields={NUTRITION_FIELDS}
      allRecipes={initialData.allRecipes}
      viewingClient={false}
    />
  )
}
