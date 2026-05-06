import { createAdminClient } from '@/lib/supabase/server'
import { removeFamilyMember, updateMemberRole } from './actions'

export const metadata = { title: 'Families — Admin' }

export default async function FamiliesPage({ searchParams }) {
  const q = (await searchParams).q?.trim() || ''
  const supabase = createAdminClient()

  let familyQuery = supabase
    .from('families')
    .select('id, name, created_at, created_by, profiles(email, display_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) familyQuery = familyQuery.ilike('name', `%${q}%`)

  const { data: familiesRaw } = await familyQuery
  const families = familiesRaw ?? []

  // Get member counts
  const familyIds = families.map(f => f.id)
  const { data: memberCountsRaw } = familyIds.length
    ? await supabase.from('family_memberships').select('family_id').in('family_id', familyIds)
    : { data: [] }
  const memberCounts = memberCountsRaw ?? []

  const countMap = memberCounts.reduce((acc, m) => {
    acc[m.family_id] = (acc[m.family_id] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{families.length} families</p>
        <form method="GET">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search family name…"
            style={{
              border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px',
              fontSize: 14, outline: 'none', width: 220,
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
              {['Family', 'Owner', 'Members', 'Created', ''].map(h => (
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
            {families.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid #fafafa' }}>
                <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1f2937' }}>{f.name}</td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ color: '#374151' }}>{f.profiles?.display_name || '—'}</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{f.profiles?.email}</div>
                </td>
                <td style={{ padding: '11px 14px', color: '#374151' }}>{countMap[f.id] || 0}</td>
                <td style={{ padding: '11px 14px', fontSize: 14, color: '#6b7280' }}>
                  {new Date(f.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  <a href={`/admin/families/${f.id}`} style={{
                    fontSize: 14, color: '#2d6e2e', textDecoration: 'none', fontWeight: 500,
                  }}>
                    View members
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {families.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
            No families found.
          </div>
        )}
      </div>
    </div>
  )
}
