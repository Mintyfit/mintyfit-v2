import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AdminTabs from '@/components/admin/AdminTabs'

export const metadata = { title: 'Admin Dashboard — MintyFit' }

export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/?auth=login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px' }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
          Manage users, subscriptions, audit logs, and GDPR requests.
        </p>
      </div>

      {/* Tab Navigation */}
      <AdminTabs />

      {/* Content */}
      <div style={{ marginTop: 24 }}>
        {children}
      </div>
    </div>
  )
}
