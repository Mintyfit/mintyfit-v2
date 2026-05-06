import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { removeFamilyMember, updateMemberRole } from '../actions'

export default async function FamilyDetailPage({ params }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: family }, { data: memberships = [] }, { data: managedMembers = [] }] = await Promise.all([
    supabase.from('families').select('id, name, created_at, profiles(email, display_name)').eq('id', id).single(),
    supabase.from('family_memberships').select('profile_id, role, profiles(email, display_name, subscription_tier, is_active)').eq('family_id', id),
    supabase.from('family_members').select('id, name, birth_date, relationship').eq('family_id', id),
  ])

  if (!family) notFound()

  return (
    <div>
      <Link href="/admin/families" style={{
        background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 14px',
        fontSize: 14, cursor: 'pointer', color: '#374151', marginBottom: 20,
        textDecoration: 'none', display: 'inline-block',
      }}>
        ← Back to Families
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 18px',
          border: '1px solid #f0f0f0',
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>{family.name}</h3>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Owner: {family.profiles?.display_name || family.profiles?.email}
          </p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Created: {new Date(family.created_at).toLocaleDateString()}
          </p>
        </div>

        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 18px',
          border: '1px solid #f0f0f0',
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#6b7280', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Managed members (kids/babies)
          </h3>
          {managedMembers.length ? (
            managedMembers.map(m => (
              <div key={m.id} style={{ fontSize: 14, padding: '4px 0', color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                <span>{m.name}</span>
                <span style={{ fontSize: 14, color: '#6b7280' }}>
                  {m.relationship} · {m.birth_date ? new Date(m.birth_date).toLocaleDateString() : '—'}
                </span>
              </div>
            ))
          ) : (
            <p style={{ color: '#6b7280', fontSize: 14 }}>No managed members.</p>
          )}
        </div>
      </div>

      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #f0f0f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Linked accounts ({memberships.length})
          </h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
              {['User', 'Role in Family', 'Tier', 'Status', ''].map(h => (
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
            {memberships.map(m => (
              <tr key={m.profile_id} style={{ borderBottom: '1px solid #fafafa' }}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>{m.profiles?.display_name || '—'}</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{m.profiles?.email}</div>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <form action={updateMemberRole} style={{ display: 'inline' }}>
                    <input type="hidden" name="familyId" value={id} />
                    <input type="hidden" name="profileId" value={m.profile_id} />
                    <select
                      name="role"
                      defaultValue={m.role}
                      style={{
                        border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px',
                        fontSize: 14, background: 'white', cursor: 'pointer',
                      }}
                    >
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
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
                <td style={{ padding: '11px 14px', fontSize: 14, color: '#6b7280' }}>
                  {m.profiles?.subscription_tier}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{
                    background: m.profiles?.is_active !== false ? '#dcfce7' : '#fef2f2',
                    color: m.profiles?.is_active !== false ? '#2d6e2e' : '#dc2626',
                    padding: '3px 10px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                  }}>
                    {m.profiles?.is_active !== false ? 'active' : 'suspended'}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  <form action={removeFamilyMember} style={{ display: 'inline' }}>
                    <input type="hidden" name="familyId" value={id} />
                    <input type="hidden" name="profileId" value={m.profile_id} />
                    <button type="submit" style={{
                      fontSize: 14, padding: '4px 10px', borderRadius: 6, border: 'none',
                      cursor: 'pointer', background: '#fef2f2', color: '#dc2626', fontWeight: 500,
                    }}>
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {memberships.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
            No linked members.
          </div>
        )}
      </div>
    </div>
  )
}
