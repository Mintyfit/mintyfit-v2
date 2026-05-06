import { createPublicClient } from '@/lib/supabase/server'
import MenusClient from '@/components/menus/MenusClient'

export const revalidate = 3600

export const metadata = {
  title: 'Meal Plans & Menus — MintyFit',
  description: 'Browse curated family meal plans. Mediterranean, plant-based, high-protein and more.',
}

async function getPublicMenus() {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('menus')
    .select('*, menu_recipes(count)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(100)
  return data || []
}

export default async function MenusPage() {
  const menus = await getPublicMenus()
  // Private/user menus are loaded client-side by MenusClient after auth check
  return <MenusClient initialMenus={menus} />
}
