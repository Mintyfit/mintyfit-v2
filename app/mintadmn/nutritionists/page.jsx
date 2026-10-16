import { createAdminClient } from '@/lib/supabase/server'
import { approveNutritionist, revokeNutritionist, updateNutritionistTier } from './actions'

export const metadata = { title: 'Nutritionists — Admin' }

export default async function NutritionistsPage() {
  const supabase = createAdminClient()

  const { data: nutritionistsRaw } = await supabase
    .from('profiles')
    .select('id, email, display_name, subscription_tier, is_active, is_approved, created_at')
    .eq('role', 'nutritionist')
    .order('created_at', { ascending: false })
  const nutritionists = nutritionistsRaw ?? []

  const { data: pendingRaw } = await supabase
    .from('profiles')
    .select('id, email, display_name, subscription_tier, is_active, is_approved, created_at, bio, credentials_url, applied_at')
    .eq('role', 'nutritionist')
    .eq('is_approved', false)
    .order('created_at', { ascending: false })
  const pending = pendingRaw ?? []

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Nutritionist Management</h2>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>
        Review applications and manage active nutritionists.
      </p>

      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#374151' }}>
            Pending Approval ({pending.length})
          </h2>
          <div style={{
            background: 'white', borderRadius: 14, border: '1px solid #fef3c7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #fef3c7', background: '#fffbeb' }}>
                  {['User', 'Bio', 'Credentials', 'Applied', 'Actions'].map(h => (
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
                {pending.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #fafafa' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>{p.display_name || '—'}</div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>{p.email}</div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 14, color: '#374151', maxWidth: 200 }}>
                      {p.bio ? (
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.bio}>
                          {p.bio}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>No bio</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 14 }}>
                      {p.credentials_url ? (
                        <a href={p.credentials_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                          View credentials
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>Not provided</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 14, color: '#6b7280' }}>
                      {p.applied_at ? new Date(p.applied_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <form action={approveNutritionist} style={{ display: 'inline' }}>
                        <input type="hidden" name="userId" value={p.id} />
                        <button type="submit" style={{
                          fontSize: 14, padding: '4px 10px', borderRadius: 6, border: 'none',
                          cursor: 'pointer', background: '#dcfce7', color: '#2d6e2e', fontWeight: 600,
                        }}>
                          Approve
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#374151' }}>
          Active Nutritionists ({nutritionists.length})
        </h2>
        <div style={{
          background: 'white', borderRadius: 14, border: '1px solid #f0f0f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
                {['User', 'Tier', 'Status', 'Joined', 'Actions'].map(h => (
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
              {nutritionists.map(n => (
                <tr key={n.id} style={{ borderBottom: '1px solid #fafafa' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>{n.display_name || '—'}</div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>{n.email}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <form action={updateNutritionistTier} style={{ display: 'inline' }}>
                      <input type="hidden" name="userId" value={n.id} />
                      <select
                        name="tier"
                        defaultValue={n.subscription_tier}
                        style={{
                          border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px',
                          fontSize: 14, background: 'white', cursor: 'pointer',
                        }}
                      >
                        <option value="nutritionist">nutritionist</option>
                        <option value="pro">pro</option>
                        <option value="basic">basic</option>
                      </select>
                      <button type="submit" style={{
                        marginLeft: 4, fontSize: 14, padding: '4px 8px', borderRadius: 6,
                        border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#2d6e2e',
                        fontWeight: 500,
                      }}>
                        Save
                      </button>
                    </form>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      background: n.is_active !== false ? '#dcfce7' : '#fef2f2',
                      color: n.is_active !== false ? '#2d6e2e' : '#dc2626',
                      padding: '3px 10px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                    }}>
                      {n.is_active !== false ? 'active' : 'suspended'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 14, color: '#6b7280' }}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <form action={revokeNutritionist} style={{ display: 'inline' }}>
                      <input type="hidden" name="userId" value={n.id} />
                      <button type="submit" style={{
                        fontSize: 14, padding: '4px 10px', borderRadius: 6, border: 'none',
                        cursor: 'pointer', background: '#fef2f2', color: '#dc2626', fontWeight: 500,
                      }}>
                        Revoke
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {nutritionists.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
              No nutritionists yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
