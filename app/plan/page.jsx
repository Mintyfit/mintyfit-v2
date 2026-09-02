import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { enrichMember } from '@/lib/member/enrichMember'
import PlannerClient from '@/components/planner/PlannerClient'
import ClientViewBanner from '@/components/nutritionist/ClientViewBanner'

export const metadata = {
  title: 'Meal Planner — MintyFit',
  description: 'Plan your family meals for the week. See nutrition at a glance for every member.',
}

async function getPlannerData(searchParams) {
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

  // Get own profile (used in both normal and client-viewing paths)
  const { data: ownProfile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  // Check if nutritionist is viewing a client's plan
  const clientId = searchParams?.clientId
  let clientProfile = null
  let viewingClient = false

  if (clientId) {
    // Verify active nutritionist-client link
    const { data: link } = await supabase
      .from('nutritionist_client_links')
      .select('id, status')
      .eq('nutritionist_id', user.id)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle()

    if (!link) {
      // No active link — redirect to own plan
      const url = new URL('/plan', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      return redirect('/plan')
    }

    viewingClient = true

    // Fetch client profile + family using admin client (RLS blocks cross-role reads)
    const adminClient = createAdminClient()

    // Get client profile with full nutrition data
    const { data: cp } = await adminClient
      .from('profiles')
      .select('id, full_name, display_name, first_name, weight, height, age, gender, goals, daily_calories_target')
      .eq('id', clientId)
      .maybeSingle()

    if (cp) {
      const { data: logs } = await adminClient
        .from('weight_logs')
        .select('weight')
        .eq('profile_id', clientId)
        .order('logged_date', { ascending: false })
        .limit(1)
      cp.weight = cp.weight ?? logs?.[0]?.weight ?? null
      clientProfile = enrichMember({ ...cp, type: 'linked' })
    }

    // Fetch client's family members
    let clientMembers = clientProfile ? [clientProfile] : []
    let clientFamilyId = null
    const { data: clientMemberships } = await adminClient
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', clientId)
      .eq('status', 'active')
      .limit(1)

    if (clientMemberships?.length) {
      clientFamilyId = clientMemberships[0].family_id

      const [{ data: clinked }, { data: cmanaged }] = await Promise.all([
        adminClient
          .from('family_memberships')
          .select('profile_id, role, profiles(id, full_name, display_name, first_name, weight, height, age, gender, goals, daily_calories_target)')
          .eq('family_id', clientFamilyId)
          .eq('status', 'active'),
        adminClient
          .from('managed_members')
          .select('id, name, date_of_birth, weight, height, gender')
          .eq('family_id', clientFamilyId),
      ])

      const linkedProfileIds = (clinked || []).map(l => l.profile_id).filter(Boolean)
      let weightByProfile = new Map()
      if (linkedProfileIds.length > 0) {
        const { data: wlogs } = await adminClient
          .from('weight_logs')
          .select('profile_id, weight')
          .in('profile_id', linkedProfileIds)
          .order('logged_date', { ascending: false })
        if (wlogs) {
          for (const log of wlogs) {
            if (!weightByProfile.has(log.profile_id)) {
              weightByProfile.set(log.profile_id, log.weight)
            }
          }
        }
      }

      clientMembers = [
        ...(clinked || []).map(l => enrichMember({
          ...l.profiles,
          type: 'linked',
          role: l.role,
          weight: l.profiles?.weight ?? weightByProfile.get(l.profile_id) ?? null,
        })),
        ...(cmanaged || []).map(m => enrichMember({
          ...m,
          display_name: m.name,
          type: 'managed',
          weight: m.weight ?? null,
          height: m.height ?? null,
        })),
      ].filter(Boolean)
    }

    return {
      userId: user.id,
      familyId: clientFamilyId,
      profile: clientProfile,
      members: clientMembers,
      ownProfile,
      viewingClient: true,
      clientProfile,
      clientId,
    }
  }

  if (!viewingClient) {
    // Normal flow: get own profile + family data
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
            weight: m.weight ?? null,
            height: m.height ?? null,
          })),
        ].filter(Boolean)
      } else {
        members = profile ? [enrichMember({ ...profile, type: 'linked' })] : []
      }
    } catch {
      members = profile ? [enrichMember({ ...profile, type: 'linked' })] : []
    }

    return { userId: user.id, familyId, profile: enrichMember(profile), members, ownProfile, viewingClient: false, clientProfile: null }
  }
}

export default async function PlanPage({ searchParams }) {
  const resolved = await searchParams
  const data = await getPlannerData(resolved)
  if (data.viewingClient && data.clientProfile) {
    const name = data.clientProfile.display_name || data.clientProfile.full_name || 'client'
    return (
      <ClientViewBanner clientName={name} pageLabel="plan" backHref="/plan">
        <PlannerClient {...data} />
      </ClientViewBanner>
    )
  }
  return <PlannerClient {...data} />
}
