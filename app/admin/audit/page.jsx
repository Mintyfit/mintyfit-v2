import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Audit Log — Admin' }

export default async function AuditPage({ searchParams }) {
  const sp = await searchParams
  const actor = sp.actor?.trim() || ''
  const action = sp.action?.trim() || ''

  const supabase = createAdminClient()

  let query = supabase
    .from('audit_logs')
    .select('id, created_at, actor_id, actor_email, action, target_id, target_type, metadata, profiles(email, display_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (actor) query = query.ilike('profiles.email', `%${actor}%`)
  if (action) query = query.ilike('action', `%${action}%`)

  const { data: logsRaw } = await query
  const logs = logsRaw ?? []

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <form method="GET" style={{ display: 'flex', gap: 10, flex: 1 }}>
          <input
            name="actor"
            defaultValue={actor}
            placeholder="Actor email…"
            style={{
              border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px',
              fontSize: 14, outline: 'none', flex: 1, minWidth: 160,
            }}
          />
          <input
            name="action"
            defaultValue={action}
            placeholder="Action contains…"
            style={{
              border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px',
              fontSize: 14, outline: 'none', flex: 1, minWidth: 160,
            }}
          />
          <button type="submit" style={{
            background: '#2d6e2e', color: 'white', border: 'none', borderRadius: 10,
            padding: '8px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
            Filter
          </button>
        </form>
      </div>

      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #f0f0f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
              {['When', 'Actor', 'Action', 'Target', 'Details'].map(h => (
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
            {logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #fafafa' }}>
                <td style={{
                  padding: '9px 14px', color: '#6b7280', fontSize: 14, whiteSpace: 'nowrap',
                }}>
                  {new Date(l.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '9px 14px', color: '#374151' }}>
                  {l.profiles?.display_name || l.profiles?.email || l.actor_email || l.actor_id?.slice(0, 8) || '—'}
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{
                    background: '#f0fdf4', color: '#2d6e2e', fontSize: 14,
                    padding: '2px 8px', borderRadius: 6, fontWeight: 500,
                  }}>
                    {l.action}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', color: '#6b7280', fontSize: 14 }}>
                  {l.target_type ? `${l.target_type}` : '—'}
                  {l.target_id ? ` · ${l.target_id.slice(0, 8)}…` : ''}
                </td>
                <td style={{
                  padding: '9px 14px', color: '#6b7280', fontSize: 14, maxWidth: 200,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {l.metadata ? JSON.stringify(l.metadata) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
            No audit log entries.
          </div>
        )}
      </div>
    </div>
  )
}
