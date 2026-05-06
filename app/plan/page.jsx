import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeBMR, SEDENTARY_MULTIPLIER } from '@/lib/nutrition/portionCalc'
import PlannerClient from '@/components/planner/PlannerClient'

export const metadata = {
  title: 'Meal Planner — MintyFit',
  description: 'Plan your family meals for the week. See nutrition at a glance for every member.',
}

function enrichMember(m) {
  if (!m) return m
  const age = m.age || 30
  const bmr = computeBMR(m.weight, m.height, age, m.gender)
  return {
    ...m,
    age,
    gender: m.gender || 'female',
    baseDailyCalories: bmr ? Math.round(bmr * SEDENTARY_MULTIPLIER) : null,
    display_name: m.display_name || m.first_name || m.name || 'Member',
  }
}

async function getPlannerData() {
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
  } catch {}

  if (!user) redirect('/?auth=login')

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, first_name, weight, height, age, gender, goals, daily_calories_target')
    .eq('id', user.id)
    .maybeSingle()

  // Get family members
  let members = []
  try {
    const { data: memberships } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', user.id)
      .limit(1)

    if (memberships?.length) {
      const familyId = memberships[0].family_id

      const [{ data: linked }, { data: managed }] = await Promise.all([
        supabase
          .from('family_memberships')
          .select('profile_id, role, profiles(id, full_name, display_name, first_name, weight, height, age, gender, goals, daily_calories_target)')
          .eq('family_id', familyId),
        supabase
          .from('managed_members')
          .select('id, name, date_of_birth, weight, height, age, gender, goals, daily_calories_target')
          .eq('family_id', familyId),
      ])

      members = [
        ...(linked || []).map(l => enrichMember({ ...l.profiles, type: 'linked', role: l.role })),
        ...(managed || []).map(m => enrichMember({ ...m, display_name: m.name, type: 'managed' })),
      ].filter(Boolean)
    } else {
      members = profile ? [enrichMember({ ...profile, type: 'linked' })] : []
    }
  } catch {
    members = profile ? [enrichMember({ ...profile, type: 'linked' })] : []
  }

  return { userId: user.id, profile: enrichMember(profile), members }
}

export default async function PlanPage() {
  const { userId, profile, members } = await getPlannerData()
  return <PlannerClient userId={userId} profile={profile} members={members} />
}
