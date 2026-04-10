import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlannerClient from '@/components/planner/PlannerClient'

export const metadata = {
  title: 'Meal Planner — MintyFit',
  description: 'Plan your family meals for the week. See nutrition at a glance for every member.',
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
    .select('id, display_name, first_name, weight, height, age, gender, goals, daily_calories_target')
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
          .select('profile_id, role, profiles(id, display_name, first_name, weight, height, age, gender, goals, daily_calories_target)')
          .eq('family_id', familyId),
        supabase
          .from('managed_members')
          .select('id, name, weight, height, age, gender, goals, daily_calories_target')
          .eq('family_id', familyId),
      ])

      members = [
        ...(linked || []).map(l => ({ ...l.profiles, type: 'linked', role: l.role })),
        ...(managed || []).map(m => ({ ...m, display_name: m.name, type: 'managed' })),
      ].filter(Boolean)
    } else {
      members = profile ? [{ ...profile, type: 'linked' }] : []
    }
  } catch {
    members = profile ? [{ ...profile, type: 'linked' }] : []
  }

  return { userId: user.id, profile, members }
}

export default async function PlanPage() {
  const { userId, profile, members } = await getPlannerData()
  return <PlannerClient userId={userId} profile={profile} members={members} />
}
