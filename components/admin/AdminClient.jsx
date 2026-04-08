'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TABS = ['overview', 'users', 'audit', 'gdpr']

export default function AdminClient({ adminData }) {
  const [tab, setTab] = useState('overview')
  const [userSearch, setUserSearch] = useState('')
  const [users, setUsers] = useState(adminData.recentUsers)
  const [auditFilter, setAuditFilter] = useState('')
  const [gdprEmail, setGdprEmail] = useState('')
  const [gdprResult, setGdprResult] = useState(null)
  const supabase = createClient()

  const { stats, auditLog, subBreakdown } = adminData

  async function searchUsers(q) {
    setUserSearch(q)
    if (!q) { setUsers(adminData.recentUsers); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, subscription_tier, created_at, role')
      .or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(50)
    setUsers(data || [])
  }

  async function updateUserRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  async function updateUserTier(userId, newTier) {
    await supabase.from('profiles').update({ subscription_tier: newTier }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_tier: newTier } : u))
  }

  async function gdprExport() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', gdprEmail)
      .single()
    if (!data) { setGdprResult({ type: 'error', message: 'User not found' }); return }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `gdpr-${gdprEmail}.json`; a.click()
    setGdprResult({ type: 'success', message: 'Export downloaded' })
  }

  async function gdprDelete() {
    if (!confirm(`Delete ALL data for ${gdprEmail}? This cannot be undone.`)) return
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', gdprEmail).single()
    if (!profile) { setGdprResult({ type: 'error', message: 'User not found' }); return }
    await supabase.from('profiles').delete().eq('id', profile.id)
    setGdprResult({ type: 'success', message: `Data for ${gdprEmail} deleted` })
  }

  const filteredAudit = auditFilter
    ? auditLog.filter(e => e.action?.toLowerCase().includes(auditFilter.toLowerCase()) ||
        e.user_id?.includes(auditFilter))
    : auditLog

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'monospace' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#38bdf8' }}>
          ⚙️ MintyFit Admin
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
              background: tab === t ? '#0ea5e9' : '#1e293b', color: '#f1f5f9', fontFamily: 'monospace',
              fontWeight: tab === t ? 700 : 400,
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Users', value: stats.users, icon: '👥' },
                { label: 'Total Recipes', value: stats.recipes, icon: '🍽️' },
                { label: 'Families', value: stats.families, icon: '👨‍👩‍👧' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1e293b', borderRadius: '0.5rem', padding: '1.25rem' }}>
                  <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8' }}>{s.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#1e293b', borderRadius: '0.5rem', padding: '1.25rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#94a3b8' }}>Subscription Breakdown</h3>
              {subBreakdown.length === 0
                ? <p style={{ color: '#64748b' }}>No data</p>
                : subBreakdown.map(({ tier, count }) => (
                  <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ textTransform: 'capitalize' }}>{tier}</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>{count}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div>
            <input
              value={userSearch}
              onChange={e => searchUsers(e.target.value)}
              placeholder="Search by email or name..."
              style={{ width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9', fontFamily: 'monospace', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Tier</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Joined</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{u.email}</td>
                      <td style={{ padding: '0.5rem' }}>{u.display_name || '—'}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <select value={u.subscription_tier || 'free'} onChange={e => updateUserTier(u.id, e.target.value)}
                          style={{ background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '0.25rem', padding: '0.2rem', fontFamily: 'monospace' }}>
                          <option value="free">free</option>
                          <option value="pro">pro</option>
                          <option value="family">family</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select value={u.role || 'user'} onChange={e => updateUserRole(u.id, e.target.value)}
                          style={{ background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '0.25rem', padding: '0.2rem', fontFamily: 'monospace' }}>
                          <option value="user">user</option>
                          <option value="nutritionist">nutritionist</option>
                          <option value="super_admin">super_admin</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem', color: '#64748b' }}>{u.created_at?.slice(0,10)}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <a href={`mailto:${u.email}`} style={{ color: '#0ea5e9', textDecoration: 'none' }}>✉</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {tab === 'audit' && (
          <div>
            <input
              value={auditFilter}
              onChange={e => setAuditFilter(e.target.value)}
              placeholder="Filter by action or user ID..."
              style={{ width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9', fontFamily: 'monospace', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            {filteredAudit.length === 0 ? (
              <p style={{ color: '#64748b' }}>No audit log entries. Ensure audit_log table exists.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Time</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Action</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>User</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudit.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '0.5rem', color: '#64748b' }}>{e.created_at?.slice(0,19)}</td>
                        <td style={{ padding: '0.5rem', color: '#38bdf8' }}>{e.action}</td>
                        <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{e.user_id?.slice(0,8)}…</td>
                        <td style={{ padding: '0.5rem', color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {JSON.stringify(e.metadata || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* GDPR Tab */}
        {tab === 'gdpr' && (
          <div>
            <div style={{ background: '#1e293b', borderRadius: '0.5rem', padding: '1.5rem', maxWidth: 500 }}>
              <h3 style={{ marginBottom: '1rem', color: '#f87171' }}>⚠️ GDPR Operations</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Export or delete all data associated with a user email.
              </p>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                User Email
              </label>
              <input
                value={gdprEmail}
                onChange={e => setGdprEmail(e.target.value)}
                placeholder="user@example.com"
                style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9', fontFamily: 'monospace', marginBottom: '1rem', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={gdprExport}
                  style={{ flex: 1, padding: '0.75rem', background: '#0ea5e9', border: 'none', borderRadius: '0.375rem', color: '#fff', cursor: 'pointer', fontFamily: 'monospace' }}>
                  📥 Export Data
                </button>
                <button onClick={gdprDelete}
                  style={{ flex: 1, padding: '0.75rem', background: '#dc2626', border: 'none', borderRadius: '0.375rem', color: '#fff', cursor: 'pointer', fontFamily: 'monospace' }}>
                  🗑️ Delete Data
                </button>
              </div>
              {gdprResult && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.375rem',
                  background: gdprResult.type === 'success' ? '#064e3b' : '#7f1d1d',
                  color: gdprResult.type === 'success' ? '#6ee7b7' : '#fca5a5' }}>
                  {gdprResult.message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
