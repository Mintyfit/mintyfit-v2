import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { enrichMember } from '@/lib/member/enrichMember'
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
    .select('id, full_name, display_name, first_name, weight, height, age, gender, goals, daily_calories_target')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) {
    const { data: logs } = await supabase
      .from('weight_logs')
      .select('weight')
      .eq('profile_id', user.id)
      .order('logged_date', { ascending: false })
      .limit(1)
    profile.weight = profile.weight ?? logs?.[0]?.weight ?? null
  }

  // Get family members + family scope. familyId flows to PlannerClient so
  // calendar reads/writes are family-wide (mig 049): every member sees the
  // same plan, and per-member recipe variants share a slot.
  let members = []
  let familyId = null
  try {
    const { data: memberships } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', user.id)
      .limit(1)

    if (memberships?.length) {
      familyId = memberships[0].family_id

      const [{ data: linked }, { data: managed }] = await Promise.all([
        supabase
          .from('family_memberships')
          .select('profile_id, role, profiles(id, full_name, display_name, first_name, weight, height, age, gender, goals, daily_calories_target)')
          .eq('family_id', familyId),
        supabase
          .from('managed_members')
          .select('id, name, date_of_birth, weight_kg, height_cm, gender')
          .eq('family_id', familyId),
      ])

      // Fetch latest weight_log for each linked member (weight lives in weight_logs, not on profiles)
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

      members = [
        ...(linked || []).map(l => enrichMember({
          ...l.profiles,
          type: 'linked',
          role: l.role,
          weight: l.profiles?.weight ?? weightByProfile.get(l.profile_id) ?? null,
        })),
        ...(managed || []).map(m => enrichMember({
          ...m,
          display_name: m.name,
          type: 'managed',
          weight: m.weight_kg ?? null,
          height: m.height_cm ?? null,
        })),
      ].filter(Boolean)
    } else {
      members = profile ? [enrichMember({ ...profile, type: 'linked' })] : []
    }
  } catch {
    members = profile ? [enrichMember({ ...profile, type: 'linked' })] : []
  }

  return { userId: user.id, familyId, profile: enrichMember(profile), members }
}

export default async function PlanPage() {
  const { userId, familyId, profile, members } = await getPlannerData()
  return <PlannerClient userId={userId} familyId={familyId} profile={profile} members={members} />
}
