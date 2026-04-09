import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatisticsClient from '@/components/statistics/StatisticsClient'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'

export const metadata = {
  title: 'Nutrition Statistics — MintyFit',
  description: 'Track your family nutrition trends, deficiencies and insights over time.',
}

async function getStatisticsData(userId, supabase) {
  try {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    const dateFrom = sevenDaysAgo.toISOString().slice(0, 10)
    const dateTo = today.toISOString().slice(0, 10)

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, subscription_tier, role, dietary_type, allergies, primary_goal')
      .eq('id', userId)
      .single()

    // Get family members (linked accounts)
    const { data: memberships } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', userId)

    let familyMembers = []
    let managedMembers = []

    if (memberships?.length) {
      const familyId = memberships[0].family_id

      const { data: allMemberships } = await supabase
        .from('family_memberships')
        .select('profile_id, role, profiles(id, name)')
        .eq('family_id', familyId)

      familyMembers = allMemberships || []

      const { data: managed } = await supabase
        .from('managed_members')
        .select('*')
        .eq('family_id', familyId)

      managedMembers = managed || []
    }

    // Get calendar nutrition for all family members in the last 7 days
    const memberIds = [userId, ...familyMembers.map(m => m.profile_id)]

    const { data: calendarEntries } = await supabase
      .from('calendar_entries')
      .select('member_id, date_str, meal_type, personal_nutrition')
      .in('member_id', memberIds)
      .gte('date_str', dateFrom)
      .lte('date_str', dateTo)

    // Get journal entries
    const { data: journalEntries } = await supabase
      .from('food_journal')
      .select('profile_id, logged_date, nutrition')
      .eq('profile_id', userId)
      .gte('logged_date', dateFrom)
      .lte('logged_date', dateTo)

    // Get member daily needs from profiles
    const memberProfiles = []
    for (const m of familyMembers) {
      const { data: mp } = await supabase
        .from('profiles')
        .select('id, name, gender, date_of_birth, subscription_tier')
        .eq('id', m.profile_id)
        .single()
      if (mp) memberProfiles.push({ ...mp, role: m.role })
    }

    // Get weight logs for sparkline
    const { data: weightLogs } = await supabase
      .from('weight_logs')
      .select('weight, logged_date')
      .eq('profile_id', userId)
      .order('logged_date', { ascending: false })
      .limit(30)

    // Get nutritionist notes for this user
    const { data: nutritionistNotes } = await supabase
      .from('nutritionist_notes')
      .select('content, created_at, nutritionist_id, profiles(name)')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    return {
      profile,
      familyMembers: memberProfiles,
      managedMembers,
      calendarEntries: calendarEntries || [],
      journalEntries: journalEntries || [],
      weightLogs: weightLogs || [],
      nutritionistNotes: nutritionistNotes || [],
      dateRange: { from: dateFrom, to: dateTo },
    }
  } catch (err) {
    console.error('Statistics data error:', err)
    return {
      profile: null,
      familyMembers: [],
      managedMembers: [],
      calendarEntries: [],
      journalEntries: [],
      weightLogs: [],
      nutritionistNotes: [],
      dateRange: { from: '', to: '' },
    }
  }
}

export default async function StatisticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')

  const data = await getStatisticsData(user.id, supabase)

  return (
    <StatisticsClient
      userId={user.id}
      initialData={data}
      nutritionFields={NUTRITION_FIELDS}
    />
  )
}
