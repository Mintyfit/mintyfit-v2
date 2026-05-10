import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import MyFamilyClient from '@/components/family/MyFamilyClient'

export const metadata = {
  title: 'My Family — MintyFit',
  description: 'Manage your family members, invite loved ones, and track nutrition together.',
}

async function getFamilyData(userId, supabase) {
  try {
    const { data: membership } = await supabase
      .from('family_memberships')
      .select('family_id, role')
      .eq('profile_id', userId)
      .single()

    if (!membership) return { family: null, memberships: [], managedMembers: [], invites: [], userRole: null }

    const { data: family } = await supabase
      .from('families')
      .select('*')
      .eq('id', membership.family_id)
      .single()

    const { data: membershipsRaw } = await supabase
      .from('family_memberships')
      .select('id, role, profile_id, joined_at')
      .eq('family_id', membership.family_id)

    const profileIds = (membershipsRaw || []).map(m => m.profile_id).filter(Boolean)
    const { data: profilesData } = profileIds.length
      ? await supabase.from('profiles').select('id, full_name, display_name, first_name, email, subscription_tier').in('id', profileIds)
      : { data: [] }

    const memberships = (membershipsRaw || []).map(m => ({
      ...m,
      profiles: (profilesData || []).find(p => p.id === m.profile_id) || null,
    }))

    const { data: managedMembers } = await supabase
      .from('managed_members')
      .select('*')
      .eq('family_id', membership.family_id)

    const { data: invites } = await supabase
      .from('family_invites')
      .select('*')
      .eq('family_id', membership.family_id)
      .order('created_at', { ascending: false })

    return {
      family,
      memberships: memberships || [],
      managedMembers: managedMembers || [],
      invites: invites || [],
      userRole: membership.role,
    }
  } catch {
    return { family: null, memberships: [], managedMembers: [], invites: [], userRole: null }
  }
}

export default async function MyFamilyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')

  const adminSupabase = createAdminClient()
  const data = await getFamilyData(user.id, adminSupabase)

  return (
    <MyFamilyClient
      userId={user.id}
      initialData={data}
    />
  )
}
