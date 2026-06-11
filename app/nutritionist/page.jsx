import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import NutritionistClient from '@/components/nutritionist/NutritionistClient'

export const metadata = {
  title: 'Nutritionist Dashboard — MintyFit',
  description: 'View your clients, their nutrition statistics, and leave professional notes.',
}

async function getNutritionistData(userId, supabase) {
  const adminClient = createAdminClient()
  try {
    // Get all client links (without join — profiles RLS blocks cross-user reads)
    const { data: links } = await supabase
      .from('nutritionist_client_links')
      .select('id, client_id, status, created_at')
      .eq('nutritionist_id', userId)
      .order('created_at', { ascending: false })

    const activeLinks = (links || []).filter(l => l.status === 'active')

    // Fetch client profiles via admin client (bypasses RLS)
    const clientIds = activeLinks.map(l => l.client_id)
    let profilesMap = {}
    if (clientIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, subscription_tier')
        .in('id', clientIds)
      for (const p of (profiles || [])) {
        profilesMap[p.id] = p
      }
    }

    // Get recent nutrition data for each client (last 7 days summary)
    const clientData = []
    for (const link of activeLinks) {
      const clientId = link.client_id
      const today = new Date().toISOString().slice(0, 10)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      // Use admin client for calendar entries (RLS may block cross-user reads)
      const { data: calEntries } = await adminClient
        .from('calendar_entries')
        .select('date_str, meal_type, personal_nutrition')
        .eq('member_id', clientId)
        .gte('date_str', sevenDaysAgo)
        .lte('date_str', today)

      const { data: recentNotes } = await supabase
        .from('nutritionist_notes')
        .select('id, content, created_at')
        .eq('nutritionist_id', userId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(3)

      // Compute weekly calorie average
      const byDate = {}
      for (const e of calEntries || []) {
        if (!byDate[e.date_str]) byDate[e.date_str] = 0
        byDate[e.date_str] += (e.personal_nutrition?.energy_kcal || 0)
      }
      const dates = Object.keys(byDate)
      const avgCalories = dates.length ? Math.round(Object.values(byDate).reduce((a, b) => a + b, 0) / dates.length) : null

      clientData.push({
        link,
        profile: profilesMap[clientId] || null,
        calendarEntries: calEntries || [],
        avgCalories,
        recentNotes: recentNotes || [],
        lastActivity: dates.length ? dates.sort().reverse()[0] : null,
      })
    }

    return { clientData, allLinks: links || [] }
  } catch (err) {
    console.error('Nutritionist data error:', err)
    return { clientData: [], allLinks: [] }
  }
}

export default async function NutritionistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')

  // Check nutritionist role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'nutritionist' && profile?.role !== 'super_admin') {
    redirect('/my-account')
  }

  const data = await getNutritionistData(user.id, supabase)

  return (
    <NutritionistClient
      userId={user.id}
      nutritionistName={profile.full_name}
      initialData={data}
    />
  )
}
