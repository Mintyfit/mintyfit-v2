import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from '@/components/admin/AdminClient'

export const metadata = {
  title: 'Admin Dashboard — MintyFit',
  robots: { index: false, follow: false },
}

async function getAdminData(supabase) {
  const [
    { count: userCount },
    { count: recipeCount },
    { count: familyCount },
    { data: recentUsers },
    { data: auditLog },
    { data: subBreakdown },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('recipes').select('*', { count: 'exact', head: true }),
    supabase.from('families').select('*', { count: 'exact', head: true }).maybeSingle().then(() =>
      supabase.from('families').select('*', { count: 'exact', head: true })
    ).catch(() => ({ count: 0 })),
    supabase
      .from('profiles')
      .select('id, email, display_name, subscription_tier, created_at, role')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(r => r)
      .catch(() => ({ data: [] })),
    supabase
      .from('profiles')
      .select('subscription_tier')
      .then(({ data }) => {
        if (!data) return { data: [] }
        const counts = data.reduce((acc, p) => {
          const t = p.subscription_tier || 'free'
          acc[t] = (acc[t] || 0) + 1
          return acc
        }, {})
        return { data: Object.entries(counts).map(([tier, count]) => ({ tier, count })) }
      }),
  ])

  return {
    stats: {
      users: userCount || 0,
      recipes: recipeCount || 0,
      families: familyCount || 0,
    },
    recentUsers: recentUsers || [],
    auditLog: auditLog || [],
    subBreakdown: subBreakdown || [],
  }
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/?auth=login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    redirect('/')
  }

  const adminData = await getAdminData(supabase)

  return <AdminClient adminData={adminData} />
}
