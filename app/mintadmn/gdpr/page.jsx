import { createAdminClient } from '@/lib/supabase/server'
import { resolveGdprRequest } from './actions'

export const metadata = { title: 'GDPR Requests — Admin' }

function StatusBadge({ status }) {
  const colors = {
    pending: { bg: '#fef9c3', color: '#ca8a04' },
    approved: { bg: '#dcfce7', color: '#2d6e2e' },
    denied: { bg: '#fef2f2', color: '#dc2626' },
  }
  const c = colors[status] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      background: c.bg, color: c.color, padding: '3px 10px',
      borderRadius: 999, fontSize: 14, fontWeight: 600,
    }}>
      {status || 'pending'}
    </span>
  )
}

export default async function GdprPage() {
  const supabase = createAdminClient()
  const { data: requestsRaw } = await supabase
    .from('gdpr_requests')
    .select('id, created_at, status, request_type, notes, profiles(email, display_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const requests = requestsRaw ?? []

  return (
    <div>
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #f0f0f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
              {['User', 'Type', 'Status', 'Requested', 'Resolved', 'Actions'].map(h => (
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
            {requests.map(req => (
              <tr key={req.id} style={{ borderBottom: '1px solid #fafafa' }}>
                <td style={{ padding: '11px 14px', color: '#374151' }}>
                  {req.profiles?.display_name || req.profiles?.email || '—'}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{
                    background: req.request_type === 'delete' ? '#fef2f2' : '#f0fdf4',
                    color: req.request_type === 'delete' ? '#dc2626' : '#2d6e2e',
                    padding: '2px 10px', borderRadius: 6, fontSize: 14, fontWeight: 500,
                  }}>
                    {req.request_type}
                  </span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <StatusBadge status={req.status} />
                </td>
                <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: 14 }}>
                  {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: 14 }}>
                  {req.resolved_at ? new Date(req.resolved_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {req.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <form action={resolveGdprRequest}>
                        <input type="hidden" name="requestId" value={req.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <button type="submit" style={{
                          fontSize: 14, padding: '4px 10px', borderRadius: 6, border: 'none',
                          cursor: 'pointer', background: '#dcfce7', color: '#2d6e2e', fontWeight: 500,
                        }}>
                          Approve
                        </button>
                      </form>
                      <form action={resolveGdprRequest}>
                        <input type="hidden" name="requestId" value={req.id} />
                        <input type="hidden" name="decision" value="denied" />
                        <button type="submit" style={{
                          fontSize: 14, padding: '4px 10px', borderRadius: 6, border: 'none',
                          cursor: 'pointer', background: '#fef2f2', color: '#dc2626', fontWeight: 500,
                        }}>
                          Deny
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Resolved</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
            No GDPR requests.
          </div>
        )}
      </div>
    </div>
  )
}
