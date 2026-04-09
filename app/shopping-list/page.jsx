import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShoppingListClient from '@/components/shopping/ShoppingListClient'

export const metadata = {
  title: 'Shopping List — MintyFit',
  description: 'Your MintyFit grocery shopping list, auto-generated from your meal plan.',
}

async function getShoppingList(userId, supabase) {
  try {
    // Get or create list
    let { data: list } = await supabase
      .from('shopping_lists')
      .select('id, name, updated_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!list) {
      const { data: created } = await supabase
        .from('shopping_lists')
        .insert({ owner_id: userId, name: 'Shopping List' })
        .select('id, name, updated_at')
        .single()
      list = created
    }

    if (!list) return { list: null, items: [] }

    const { data: items } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', list.id)
      .order('created_at', { ascending: true })

    return { list, items: items || [] }
  } catch {
    return { list: null, items: [] }
  }
}

export default async function ShoppingListPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')

  const { list, items } = await getShoppingList(user.id, supabase)

  return <ShoppingListClient initialList={list} initialItems={items} />
}
