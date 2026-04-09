import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MyAccountClient from '@/components/account/MyAccountClient'

export const metadata = {
  title: 'My Profile — MintyFit',
  description: 'Manage your personal nutrition profile, goals, and subscription.',
}

async function getProfileData(userId, supabase) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // Latest weight + recent weight logs
    const { data: weightLogs } = await supabase
      .from('weight_logs')
      .select('id, weight, logged_date, note')
      .eq('profile_id', userId)
      .order('logged_date', { ascending: false })
      .limit(30)

    // Check if user has a nutritionist linked
    const { data: nutritionistLink } = await supabase
      .from('nutritionist_client_links')
      .select('id, status, nutritionist_id, profiles(name, id)')
      .eq('client_id', userId)
      .eq('status', 'active')
      .single()

    return {
      profile,
      weightLogs: weightLogs || [],
      nutritionistLink: nutritionistLink || null,
    }
  } catch {
    return { profile: null, weightLogs: [], nutritionistLink: null }
  }
}

export default async function MyAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')

  const data = await getProfileData(user.id, supabase)

  return (
    <MyAccountClient
      userId={user.id}
      userEmail={user.email}
      initialData={data}
    />
  )
}
