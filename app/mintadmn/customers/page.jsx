import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { toggleSuspend, updateProfileField } from './actions'
import InlineSelect from '@/components/admin/InlineSelect'

export const metadata = { title: 'Customers — Admin' }

export default async function CustomersPage({ searchParams }) {
  const q = (await searchParams).q?.trim() || ''
  const supabase = createAdminClient()

  let query = supabase
    .from('profiles')
    .select('id, email, role, subscription_tier, is_active, is_approved, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (q) query = query.or(`email.ilike.%${q}%`)

  const { data: profiles, error } = await query
  if (error) {
    console.error('Customers query error:', error)
  }
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error.message}</div>
  const allProfiles = profiles ?? []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{allProfiles.length} total users</p>
        <form method="GET">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, role…"
            style={{
              border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px',
              fontSize: 14, outline: 'none', width: 280,
            }}
          />
        </form>
      </div>

      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #f0f0f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
              {['Name / Email', 'Role', 'Tier', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '10px 14px', fontWeight: 600,
                  color: '#6b7280', fontSize: 14,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allProfiles.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #fafafa' }}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>
                    <Link href={`/admin/customers/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {p.email}
                    </Link>
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 14 }}>{p.role || 'customer'}</div>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <InlineSelect
                    name="role"
                    defaultValue={p.role}
                    action={updateProfileField}
                    hiddenFields={{ userId: p.id }}
                    options={[
                      { value: 'customer', label: 'customer' },
                      { value: 'nutritionist', label: 'nutritionist' },
                      { value: 'super_admin', label: 'super_admin' },
                    ]}
                  />
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <InlineSelect
                    name="subscription_tier"
                    defaultValue={p.subscription_tier}
                    action={updateProfileField}
                    hiddenFields={{ userId: p.id }}
                    options={[
                      { value: 'free', label: 'free' },
                      { value: 'basic', label: 'basic' },
                      { value: 'pro', label: 'pro' },
                      { value: 'nutritionist', label: 'nutritionist' },
                    ]}
                  />
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{
                    background: p.is_active !== false ? '#dcfce7' : '#fef2f2',
                    color: p.is_active !== false ? '#2d6e2e' : '#dc2626',
                    padding: '3px 10px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                  }}>
                    {p.is_active !== false ? 'active' : 'suspended'}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: 14 }}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link
                      href={`/admin/customers/${p.id}`}
                      style={{
                        fontSize: 14, padding: '4px 10px', borderRadius: 6,
                        border: 'none', cursor: 'pointer', background: '#f0fdf4',
                        color: '#2d6e2e', fontWeight: 500, textDecoration: 'none',
                      }}
                    >
                      Detail
                    </Link>
                    <form action={toggleSuspend} style={{ display: 'inline' }}>
                      <input type="hidden" name="userId" value={p.id} />
                      <input type="hidden" name="currentActive" value={String(p.is_active)} />
                      <button type="submit" style={{
                        fontSize: 14, padding: '4px 10px', borderRadius: 6, border: 'none',
                        cursor: 'pointer',
                        background: p.is_active === false ? '#dcfce7' : '#fef2f2',
                        color: p.is_active === false ? '#2d6e2e' : '#dc2626',
                      }}>
                        {p.is_active === false ? 'Activate' : 'Suspend'}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {allProfiles.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
            No customers match your search.
          </div>
        )}
      </div>
    </div>
  )
}
