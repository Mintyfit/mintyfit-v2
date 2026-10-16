import { createAdminClient } from '@/lib/supabase/server'
import { setPublic } from './actions'

export const metadata = { title: 'Approvals — Admin' }

export default async function ApprovalsPage() {
  const supabase = createAdminClient()

  const [{ data: recipesRaw }, { data: menusRaw }] = await Promise.all([
    supabase
      .from('recipes')
      .select('id, name, description, meal_type, image_thumb_url, image_url, created_at, is_public, profiles(email, display_name, role)')
      .eq('profiles.role', 'nutritionist')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('menus')
      .select('id, name, description, image_thumb_url, image_url, created_at, is_public, profiles(email, display_name, role)')
      .eq('profiles.role', 'nutritionist')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const recipes = recipesRaw ?? []
  const menus = menusRaw ?? []
  const pendingRecipes = recipes.filter(r => !r.is_public)
  const pendingMenus = menus.filter(m => !m.is_public)

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Pending Approvals</h2>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>
        Private content from nutritionists awaiting review. Approving makes it public and marks the creator as approved.
      </p>

      <Section title={`Recipes (${pendingRecipes.length} pending)`} items={pendingRecipes} table="recipes" type="recipe" />
      <div style={{ height: 24 }} />
      <Section title={`Menus (${pendingMenus.length} pending)`} items={pendingMenus} table="menus" type="menu" />
    </div>
  )
}

function Section({ title, items, table, type }) {
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#374151' }}>{title}</h2>
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #f0f0f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
              {['Type', 'Title', 'Creator', 'Submitted', 'Actions'].map(h => (
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
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #fafafa' }}>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{
                    background: type === 'recipe' ? '#eff6ff' : '#fdf4ff',
                    color: type === 'recipe' ? '#2563eb' : '#9333ea',
                    padding: '2px 10px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  }}>
                    {type}
                  </span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>{item.name}</div>
                  {item.description && (
                    <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ color: '#374151' }}>{item.profiles?.display_name || '—'}</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{item.profiles?.email || ''}</div>
                </td>
                <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: 14 }}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <form action={setPublic} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="table" value={table} />
                      <input type="hidden" name="approve" value="true" />
                      <button type="submit" style={{
                        fontSize: 14, padding: '4px 10px', borderRadius: 6, border: 'none',
                        cursor: 'pointer', background: '#dcfce7', color: '#2d6e2e', fontWeight: 600,
                      }}>
                        Approve
                      </button>
                    </form>
                    <form action={setPublic} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="table" value={table} />
                      <input type="hidden" name="approve" value="false" />
                      <button type="submit" style={{
                        fontSize: 14, padding: '4px 10px', borderRadius: 6, border: 'none',
                        cursor: 'pointer', background: '#fef2f2', color: '#dc2626', fontWeight: 500,
                      }}>
                        Reject
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
            Nothing pending.
          </div>
        )}
      </div>
    </div>
  )
}
