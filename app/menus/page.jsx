import { createPublicClient, createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import MenusClient from '@/components/menus/MenusClient'

export const revalidate = 60

export const metadata = {
  title: 'Meal Plans & Menus — MintyFit',
  description: 'Browse curated family meal plans. Mediterranean, plant-based, high-protein and more.',
}

async function getMenus() {
  try {
    const cookieStore = cookies()
    let supabase = createClient(cookieStore)
    let userId = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    } catch {}

    const publicClient = createPublicClient()

    // Always fetch public menus
    const { data: publicMenus } = await publicClient
      .from('menus')
      .select('*, menu_recipes(count)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(100)

    let userMenus = []
    if (userId) {
      const { data } = await supabase
        .from('menus')
        .select('*, menu_recipes(count)')
        .eq('profile_id', userId)
        .eq('is_public', false)
        .order('created_at', { ascending: false })
        .limit(20)
      userMenus = data || []
    }

    const seen = new Set()
    const menus = [...(publicMenus || []), ...userMenus].filter(m => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })

    return menus
  } catch {
    return []
  }
}

export default async function MenusPage() {
  const menus = await getMenus()
  return <MenusClient initialMenus={menus} />
}
