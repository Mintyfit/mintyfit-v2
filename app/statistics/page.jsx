import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'
import StatisticsClient from '@/components/statistics/StatisticsClient'

const HISTORY_DAYS = 120

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

async function getStatisticsData(userId, supabase) {
  try {
    const today = new Date()
    const historyFrom = new Date(today)
    historyFrom.setDate(today.getDate() - HISTORY_DAYS)
    const fromKey = toDateKey(historyFrom)

    const { data: me } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, name, role, gender, date_of_birth, weight, weight_kg, height, height_cm, subscription_tier')
      .eq('id', userId)
      .maybeSingle()

    const { data: memberships } = await supabase
      .from('family_memberships')
      .select('family_id, role, status')
      .eq('profile_id', userId)
      .eq('status', 'active')
      .limit(1)

    let linkedMembers = []
    let managedMembers = []

    if (memberships?.length) {
      const familyId = memberships[0].family_id

      const { data: linked } = await supabase
        .from('family_memberships')
        .select('profile_id, role, status, profiles(id, display_name, full_name, name, gender, date_of_birth, weight, weight_kg, height, height_cm)')
        .eq('family_id', familyId)
        .eq('status', 'active')

      linkedMembers = (linked || [])
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

      const { data: managed } = await supabase
        .from('managed_members')
        .select('id, name, gender, date_of_birth, weight_kg, height_cm')
        .eq('family_id', familyId)

      managedMembers = (managed || []).map(m => ({
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

    const { data: calendarEntries } = await supabase
      .from('calendar_entries')
      .select(`
        id,
        date_str,
        meal_type,
        member_id,
        personal_nutrition,
        recipe_id,
        recipe_name,
        recipes(id, title, slug, image_url, image_thumb_url, nutrition, servings)
      `)
      .eq('profile_id', userId)
      .gte('date_str', fromKey)
      .order('date_str', { ascending: false })

    const { data: journalEntries } = await supabase
      .from('food_journal')
      .select('id, logged_date, meal_type, member_id, food_name, amount, unit, nutrition')
      .eq('profile_id', userId)
      .gte('logged_date', fromKey)
      .order('logged_date', { ascending: false })

    const { data: weightLogs } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('profile_id', userId)
      .order('logged_date', { ascending: false })
      .limit(60)

    return {
      members,
      calendarEntries: calendarEntries || [],
      journalEntries: journalEntries || [],
      weightLogs: weightLogs || [],
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

export default async function StatisticsPage() {
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

  const initialData = await getStatisticsData(user.id, supabase)

  return (
    <StatisticsClient
      userId={user.id}
      initialData={initialData}
      nutritionFields={NUTRITION_FIELDS}
    />
  )
}
