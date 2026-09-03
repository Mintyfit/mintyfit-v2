import { toDateKey } from '@/lib/utils/dateKey'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'
import { enrichMember } from '@/lib/member/enrichMember'
import StatisticsClient from '@/components/statistics/StatisticsClient'
import EstimatedMemberBanner from '@/components/planner/EstimatedMemberBanner'
import ClientViewBanner from '@/components/nutritionist/ClientViewBanner'

function ageFromDob(dob) {
  if (!dob) return undefined
  const d = new Date(dob)
  if (isNaN(d.getTime())) return undefined
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 31557600000))
}

const HISTORY_DAYS = 60

export const metadata = {
  title: 'Nutrition Statistics - MintyFit',
  description: 'Family nutrition analytics with date range, member filters, and nutrient breakdown.',
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

    const [meResult, membershipsResult, calendarResult, journalResult, weightLogsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, full_name, name, role, gender, date_of_birth, weight, height, subscription_tier')
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
          id, date_str, meal_type, member_id, consumer_member_ids, personal_nutrition,
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
          .select('profile_id, role, status, profiles(id, display_name, full_name, name, gender, date_of_birth, weight, height)')
          .eq('family_id', familyId)
          .eq('status', 'active'),
        supabase
          .from('managed_members')
          .select('id, name, gender, date_of_birth, weight, height')
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
          weight: r.profiles.weight ?? null,
          height: r.profiles.height ?? null,
        }))

      managedMembers = (managedResult?.data || []).map(m => ({
        id: m.id,
        name: m.name || 'Child',
        type: 'managed',
        role: 'managed',
        gender: m.gender,
        date_of_birth: m.date_of_birth,
        weight: m.weight ?? null,
        height: m.height ?? null,
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
        weight: me.weight ?? null,
        height: me.height ?? null,
      })
    }

    for (const m of linkedMembers) membersById.set(m.id, m)
    for (const m of managedMembers) membersById.set(m.id, m)

    // Enrich members (baseDailyCalories, fallback weight/height) so the
    // calorie-budget per-consumer split in StatisticsClient has real targets —
    // same model the planner uses. enrichMember needs a numeric age.
    const members = Array.from(membersById.values())
      .map(m => enrichMember({ ...m, age: ageFromDob(m.date_of_birth) }))

    return {
      members,
      calendarEntries: calendarResult?.data || [],
      journalEntries: journalResult?.data || [],
      weightLogs: weightLogsResult?.data || [],
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
        <EstimatedMemberBanner members={initialData.members} />
        <StatisticsClient
          userId={clientId}
          initialData={initialData}
          nutritionFields={NUTRITION_FIELDS}
          viewingClient={true}
          clientName={clientName}
        />
      </ClientViewBanner>
    )
  }

  const initialData = await getStatisticsData(user.id, supabase)

  return (
    <>
      <EstimatedMemberBanner members={initialData.members} />
      <StatisticsClient
        userId={user.id}
        initialData={initialData}
        nutritionFields={NUTRITION_FIELDS}
        viewingClient={false}
      />
    </>
  )
}
